import { useEffect, useState } from 'react';
import { getApiUrl, getSecretKey } from '../../../config';
import { all_response_styles, ResponseStyleSelectionItem } from './ResponseStyleSelectionItem';

export const ResponseStylesSection = () => {
  const [currentStyle, setCurrentStyle] = useState('default');

  const handleStyleChange = async (newStyle: string) => {
    const storeResponse = await fetch(getApiUrl('/configs/store'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': getSecretKey(),
      },
      body: JSON.stringify({
        key: 'RESPONSE_STYLE',
        value: newStyle,
        isSecret: false,
      }),
    });

    if (!storeResponse.ok) {
      const errorText = await storeResponse.text();
      console.error('Store response error:', errorText);
      throw new Error(`Failed to store new response style: ${newStyle}`);
    }
    setCurrentStyle(newStyle);
  };

  useEffect(() => {
    const fetchCurrentStyle = async () => {
      try {
        const response = await fetch(getApiUrl('/configs/get?key=RESPONSE_STYLE'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Secret-Key': getSecretKey(),
          },
        });

        if (response.ok) {
          const { value } = await response.json();
          if (value) {
            setCurrentStyle(value);
          }
        }
      } catch (error) {
        console.error('Error fetching current response style:', error);
      }
    };

    fetchCurrentStyle();
  }, []);

  return (
    <section id="responseStyles" className="px-8">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-medium text-textStandard">Response Styles</h2>
      </div>
      <div className="pb-8">
        <p className="text-sm text-textStandard mb-6">
          This setting will control the default behavior when displaying tool calls in the Ul.{' '}
        </p>
        <div>
          {all_response_styles.map((style) => (
            <ResponseStyleSelectionItem
              key={style.key}
              style={style}
              currentStyle={currentStyle}
              showDescription={true}
              handleStyleChange={handleStyleChange}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
