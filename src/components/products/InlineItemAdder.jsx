import { useState } from 'react';
import { Button, Input, InputNumber } from 'antd';

// A row of fields shown in place, for adding one plain text item to a package.
export default function InlineItemAdder({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const trimmed = name.trim();

  const add = () => {
    if (!trimmed || !quantity) {
      return;
    }
    onAdd({ name: trimmed, quantity });
    setName('');
    setQuantity(1);
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-soft p-3">
      <Input
        autoFocus
        aria-label="Item name"
        placeholder="Type item name"
        maxLength={150}
        style={{ minWidth: 220, flex: 1 }}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onPressEnter={add}
      />
      <InputNumber
        aria-label="Quantity"
        min={1}
        precision={0}
        style={{ width: 80 }}
        value={quantity}
        onChange={setQuantity}
      />
      <Button type="primary" disabled={!trimmed || !quantity} onClick={add}>
        Add
      </Button>
      <Button onClick={onCancel}>Cancel</Button>
    </div>
  );
}
