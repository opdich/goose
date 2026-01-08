use anyhow::Result;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::conversation::message::Message;
use crate::providers::base::Provider;
use crate::session::session_manager::SessionManager;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub citations: Vec<NoteCitation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct NoteCitation {
    pub session_id: String,
    pub message_id: String,
    pub citation_index: i32,
}

const NOTE_GENERATION_SYSTEM_PROMPT: &str = r#"You are a helpful assistant that creates well-organized markdown notes from conversation transcripts.

Your task is to:
1. Extract key information, insights, decisions, and important details from the conversation
2. Organize the content by topic or theme (not chronologically)
3. Create clear section headings using markdown
4. For each piece of information, include a citation marker in the format [[N]](#cite-N) where N is an integer starting from 1
5. Use proper markdown formatting (headings, lists, code blocks, etc.)

The citation markers [[1]](#cite-1), [[2]](#cite-2), etc. will be linked back to the original messages. Place them immediately after the relevant sentence or paragraph.

Create a comprehensive, well-structured note that captures the essential information from the conversation."#;

pub struct NoteGenerator {
    provider: std::sync::Arc<dyn Provider>,
}

impl NoteGenerator {
    pub fn new(provider: std::sync::Arc<dyn Provider>) -> Self {
        Self { provider }
    }

    pub async fn generate_note_from_sessions(
        &self,
        session_ids: Vec<String>,
        user_title: Option<String>,
    ) -> Result<Note> {
        tracing::info!("Generating note from {} sessions", session_ids.len());
        
        let mut all_messages = Vec::new();
        let mut message_sources = Vec::new();

        for session_id in &session_ids {
            tracing::debug!("Loading session: {}", session_id);
            let session = SessionManager::get_session(session_id, true).await
                .map_err(|e| anyhow::anyhow!("Failed to load session {}: {}", session_id, e))?;
            
            if let Some(conversation) = session.conversation {
                tracing::debug!("Found {} messages in session {}", conversation.messages().len(), session_id);
                for message in conversation.messages() {
                    let message_id = message.id.clone().unwrap_or_else(|| 
                        format!("msg_{}", message.created)
                    );
                    
                    message_sources.push((session_id.clone(), message_id));
                    all_messages.push(message.clone());
                }
            } else {
                tracing::warn!("Session {} has no conversation", session_id);
            }
        }

        if all_messages.is_empty() {
            anyhow::bail!("No messages found in the provided sessions. Make sure the sessions have conversations.");
        }
        
        tracing::info!("Found {} total messages to process", all_messages.len());

        let conversation_text = self.format_conversation_for_llm(&all_messages);
        tracing::debug!("Formatted conversation text: {} chars", conversation_text.len());
        
        let user_prompt = format!(
            "Here is the conversation to summarize into a note:\n\n{}\n\nCreate a well-organized markdown note from this conversation.",
            conversation_text
        );

        let user_message = Message::user().with_text(&user_prompt);

        tracing::info!("Calling LLM provider to generate note");
        let (response, _usage) = self.provider.complete(
            NOTE_GENERATION_SYSTEM_PROMPT,
            &[user_message],
            &[],
        ).await.map_err(|e| anyhow::anyhow!("Provider error: {}", e))?;
        
        let note_content = response.as_concat_text();
        tracing::info!("Generated note content: {} chars", note_content.len());

        let citations = self.extract_citations(&note_content, &message_sources);
        tracing::debug!("Extracted {} citations", citations.len());
        
        let title = user_title.unwrap_or_else(|| {
            self.generate_title(&note_content).unwrap_or_else(|_| "Untitled Note".to_string())
        });
        tracing::info!("Note title: {}", title);

        // Prepend title as H1 to the content
        let full_content = format!("# {}\n\n{}", title, note_content);

        tracing::info!("Saving note to database");
        let note_id = SessionManager::create_note(title.clone(), full_content.clone()).await
            .map_err(|e| anyhow::anyhow!("Failed to save note: {}", e))?;
        tracing::info!("Note saved with ID: {}", note_id);

        tracing::debug!("Saving {} citations", citations.len());
        for citation in &citations {
            SessionManager::add_note_citation(
                &note_id,
                &citation.session_id,
                &citation.message_id,
                citation.citation_index,
            )
            .await
            .map_err(|e| anyhow::anyhow!("Failed to save citation: {}", e))?;
        }

        tracing::info!("Note generation complete");
        Ok(Note {
            id: note_id,
            title,
            content: full_content,
            citations,
        })
    }

    fn format_conversation_for_llm(&self, messages: &[Message]) -> String {
        messages
            .iter()
            .map(|msg| {
                let role = match msg.role {
                    rmcp::model::Role::User => "User",
                    rmcp::model::Role::Assistant => "Assistant",
                };
                
                let content = msg
                    .content
                    .iter()
                    .filter_map(|c| {
                        if let crate::conversation::message::MessageContent::Text(text) = c {
                            Some(text.text.as_str())
                        } else {
                            None
                        }
                    })
                    .collect::<Vec<_>>()
                    .join("\n");

                format!("{}: {}", role, content)
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    }

    fn extract_citations(
        &self,
        content: &str,
        message_sources: &[(String, String)],
    ) -> Vec<NoteCitation> {
        let mut citations = Vec::new();
        
        let citation_regex = regex::Regex::new(r"\[\[(\d+)\]\]\(#cite-\d+\)").unwrap();
        
        for cap in citation_regex.captures_iter(content) {
            if let Some(num_str) = cap.get(1) {
                if let Ok(citation_num) = num_str.as_str().parse::<usize>() {
                    if citation_num > 0 && citation_num <= message_sources.len() {
                        let (session_id, message_id) = &message_sources[citation_num - 1];
                        citations.push(NoteCitation {
                            session_id: session_id.clone(),
                            message_id: message_id.clone(),
                            citation_index: citation_num as i32,
                        });
                    }
                }
            }
        }

        citations
    }

    fn generate_title(&self, content: &str) -> Result<String> {
        let first_heading = content
            .lines()
            .find(|line| line.trim().starts_with('#'))
            .and_then(|line| {
                let without_hashes = line.trim_start_matches('#').trim();
                if without_hashes.is_empty() {
                    None
                } else {
                    Some(without_hashes.to_string())
                }
            });

        if let Some(title) = first_heading {
            return Ok(title);
        }

        let first_line = content
            .lines()
            .find(|line| !line.trim().is_empty())
            .map(|line| {
                let mut title = line.to_string();
                if title.len() > 60 {
                    title.truncate(57);
                    title.push_str("...");
                }
                title
            })
            .unwrap_or_else(|| "Untitled Note".to_string());

        Ok(first_line)
    }
}

pub async fn generate_note(
    provider: std::sync::Arc<dyn Provider>,
    session_ids: Vec<String>,
    user_title: Option<String>,
) -> Result<Note> {
    let generator = NoteGenerator::new(provider);
    generator.generate_note_from_sessions(session_ids, user_title).await
}

