import { forwardRef } from 'react';
import { ColorPicker, Input, Space } from 'antd';

const VALID_HEX = /^#[0-9a-fA-F]{6}$/;

// The picker and the text box share one value, so each always shows what the other set.
const HexColorInput = forwardRef(function HexColorInput({ id, value, onChange, onBlur }, ref) {
  return (
    <Space.Compact className="w-full">
      <ColorPicker
        disabledAlpha
        aria-label="Pick a colour"
        value={VALID_HEX.test(value ?? '') ? value : '#000000'}
        onChange={(color) => onChange(color.toHexString().toUpperCase())}
      />
      <Input
        ref={ref}
        id={id}
        value={value ?? ''}
        placeholder="#7A1F3D"
        maxLength={7}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        onBlur={onBlur}
      />
    </Space.Compact>
  );
});

export default HexColorInput;
