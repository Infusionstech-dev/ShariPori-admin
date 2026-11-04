import { useCallback } from 'react';
import { useSelector } from 'react-redux';

export const hasPermission = (granted, permission) =>
  granted.some(
    (item) =>
      item === '*' ||
      item === permission ||
      (item.endsWith('.*') && permission.startsWith(item.slice(0, -1)))
  );

export default function usePermission() {
  const permissions = useSelector((state) => state.auth.permissions);

  return useCallback((permission) => hasPermission(permissions, permission), [permissions]);
}
