import { forwardRef, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';

const isHttpUrl = (value) => /^https?:\/\/\S+$/i.test(value ?? '');

// Controlled like any antd input: value is the URL string, or empty for no image.
const ImageUrlInput = forwardRef(function ImageUrlInput(
  { id, value, onChange, onBlur, status },
  ref
) {
  const [failedUrl, setFailedUrl] = useState(null);
  const showPreview = isHttpUrl(value);
  const failed = showPreview && failedUrl === value;

  return (
    <div className="space-y-2">
      <Input
        ref={ref}
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        status={status}
        inputMode="url"
        placeholder="https://example.com/image.jpg"
      />
      {showPreview && (
        <div className="flex items-center gap-3">
          {failed ? (
            <p role="alert" className="text-sm text-red-700">
              This image could not be loaded. Check the link.
            </p>
          ) : (
            <img
              src={value}
              alt="Preview"
              onError={() => setFailedUrl(value)}
              className="h-20 w-20 rounded-lg border border-soft object-cover"
            />
          )}
          <Button icon={<DeleteOutlined />} onClick={() => onChange('')}>
            Remove
          </Button>
        </div>
      )}
    </div>
  );
});

export default ImageUrlInput;
