use crate::state::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use goose::config::Config;
use goose::model::ModelConfig;
use goose::notes::{generate_note, Note};
use goose::providers::create;
use goose::session::session_manager::SessionManager;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorResponse {
    pub message: String,
    #[serde(skip)]
    pub status: StatusCode,
}

impl axum::response::IntoResponse for ErrorResponse {
    fn into_response(self) -> axum::response::Response {
        (
            self.status,
            Json(serde_json::json!({ "message": self.message })),
        )
            .into_response()
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateNoteRequest {
    pub session_ids: Vec<String>,
    pub title: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CreateNoteResponse {
    pub note: Note,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NoteListItem {
    pub id: String,
    pub title: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListNotesResponse {
    pub notes: Vec<NoteListItem>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct GetNoteResponse {
    pub id: String,
    pub title: String,
    pub content: String,
    pub citations: Vec<NoteCitationResponse>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NoteCitationResponse {
    pub session_id: String,
    pub message_id: String,
    pub citation_index: i32,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateNoteRequest {
    pub title: String,
    pub content: String,
}

#[utoipa::path(
    post,
    path = "/notes/create",
    request_body = CreateNoteRequest,
    responses(
        (status = 200, description = "Note created successfully", body = CreateNoteResponse),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Notes"
)]
async fn create_note(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateNoteRequest>,
) -> Result<Json<CreateNoteResponse>, ErrorResponse> {
    if request.session_ids.is_empty() {
        return Err(ErrorResponse {
            message: "At least one session ID is required".to_string(),
            status: StatusCode::BAD_REQUEST,
        });
    }

    let first_session_id = request.session_ids[0].clone();

    tracing::info!("Creating note from sessions: {:?}", request.session_ids);

    // Load the session to get provider configuration
    let session = SessionManager::get_session(&first_session_id, false)
        .await
        .map_err(|e| {
            tracing::error!("Failed to load session {}: {:?}", first_session_id, e);
            ErrorResponse {
                message: format!("Failed to load session: {}", e),
                status: StatusCode::NOT_FOUND,
            }
        })?;

    // Get or create agent for the session
    let agent = state
        .get_agent_for_route(first_session_id.clone())
        .await
        .map_err(|e| {
            tracing::error!(
                "Failed to get agent for session {}: {:?}",
                first_session_id,
                e
            );
            ErrorResponse {
                message: format!("Agent not initialized for session {}", first_session_id),
                status: StatusCode::INTERNAL_SERVER_ERROR,
            }
        })?;

    // Get provider configuration
    let config = Config::global();
    let provider_name = session
        .provider_name
        .clone()
        .or_else(|| config.get_goose_provider().ok())
        .ok_or_else(|| {
            tracing::error!("No provider configured");
            ErrorResponse {
                message: "No provider configured. Please configure a provider in settings.".into(),
                status: StatusCode::BAD_REQUEST,
            }
        })?;

    let model_config = match session.model_config.clone() {
        Some(saved_config) => saved_config,
        None => {
            let model_name = config.get_goose_model().map_err(|_| {
                tracing::error!("No model configured");
                ErrorResponse {
                    message: "No model configured. Please configure a model in settings.".into(),
                    status: StatusCode::BAD_REQUEST,
                }
            })?;
            ModelConfig::new(&model_name).map_err(|e| {
                tracing::error!("Invalid model config: {}", e);
                ErrorResponse {
                    message: format!("Invalid model configuration: {}", e),
                    status: StatusCode::BAD_REQUEST,
                }
            })?
        }
    };

    // Create provider
    tracing::info!(
        "Creating provider: {} with model: {}",
        provider_name,
        model_config.model_name
    );
    let provider = create(&provider_name, model_config).await.map_err(|e| {
        tracing::error!("Failed to create provider: {:?}", e);
        ErrorResponse {
            message: format!("Failed to create provider: {}", e),
            status: StatusCode::INTERNAL_SERVER_ERROR,
        }
    })?;

    // Update agent with provider
    agent
        .update_provider(provider.clone(), &first_session_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update agent provider: {:?}", e);
            ErrorResponse {
                message: format!("Failed to configure agent: {}", e),
                status: StatusCode::INTERNAL_SERVER_ERROR,
            }
        })?;

    tracing::info!("Generating note with provider");
    let note = generate_note(provider, request.session_ids.clone(), request.title.clone())
        .await
        .map_err(|e| {
            tracing::error!("Failed to generate note: {:?}", e);
            ErrorResponse {
                message: format!("Failed to generate note: {}", e),
                status: StatusCode::INTERNAL_SERVER_ERROR,
            }
        })?;

    Ok(Json(CreateNoteResponse { note }))
}

#[utoipa::path(
    get,
    path = "/notes/list",
    responses(
        (status = 200, description = "Notes retrieved successfully", body = ListNotesResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Notes"
)]
async fn list_notes() -> Result<Json<ListNotesResponse>, ErrorResponse> {
    let notes = SessionManager::list_notes()
        .await
        .map_err(|e| ErrorResponse {
            message: format!("Failed to list notes: {}", e),
            status: StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    let notes = notes
        .into_iter()
        .map(|(id, title, updated_at)| NoteListItem {
            id,
            title,
            updated_at: updated_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(ListNotesResponse { notes }))
}

#[utoipa::path(
    get,
    path = "/notes/{id}",
    params(
        ("id" = String, Path, description = "Note ID")
    ),
    responses(
        (status = 200, description = "Note retrieved successfully", body = GetNoteResponse),
        (status = 404, description = "Note not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Notes"
)]
async fn get_note(Path(id): Path<String>) -> Result<Json<GetNoteResponse>, ErrorResponse> {
    let (note_id, title, content) =
        SessionManager::get_note(&id)
            .await
            .map_err(|e| ErrorResponse {
                message: format!("Failed to get note: {}", e),
                status: StatusCode::NOT_FOUND,
            })?;

    let citations = SessionManager::get_note_citations(&id)
        .await
        .map_err(|e| ErrorResponse {
            message: format!("Failed to get citations: {}", e),
            status: StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    let citations = citations
        .into_iter()
        .map(
            |(_, session_id, message_id, citation_index)| NoteCitationResponse {
                session_id,
                message_id,
                citation_index,
            },
        )
        .collect();

    Ok(Json(GetNoteResponse {
        id: note_id,
        title,
        content,
        citations,
    }))
}

#[utoipa::path(
    put,
    path = "/notes/{id}",
    params(
        ("id" = String, Path, description = "Note ID")
    ),
    request_body = UpdateNoteRequest,
    responses(
        (status = 200, description = "Note updated successfully"),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 404, description = "Note not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Notes"
)]
async fn update_note(
    Path(id): Path<String>,
    Json(request): Json<UpdateNoteRequest>,
) -> Result<StatusCode, ErrorResponse> {
    SessionManager::update_note(&id, request.title, request.content)
        .await
        .map_err(|e| ErrorResponse {
            message: format!("Failed to update note: {}", e),
            status: StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    Ok(StatusCode::OK)
}

#[utoipa::path(
    delete,
    path = "/notes/{id}",
    params(
        ("id" = String, Path, description = "Note ID")
    ),
    responses(
        (status = 200, description = "Note deleted successfully"),
        (status = 404, description = "Note not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Notes"
)]
async fn delete_note(Path(id): Path<String>) -> Result<StatusCode, ErrorResponse> {
    SessionManager::delete_note(&id)
        .await
        .map_err(|e| ErrorResponse {
            message: format!("Failed to delete note: {}", e),
            status: StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    Ok(StatusCode::OK)
}

pub fn routes(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/notes/create", post(create_note))
        .route("/notes/list", get(list_notes))
        .route("/notes/{id}", get(get_note))
        .route("/notes/{id}", axum::routing::put(update_note))
        .route("/notes/{id}", axum::routing::delete(delete_note))
        .with_state(state)
}
