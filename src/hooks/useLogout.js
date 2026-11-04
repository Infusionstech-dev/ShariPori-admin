import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useLogoutMutation } from '../store/api/authApi';
import { baseApi } from '../store/api/baseApi';
import { logout } from '../store/slices/authSlice';

export default function useLogout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logoutRequest] = useLogoutMutation();

  return async () => {
    // Sign out locally even if the request fails, so a network error cannot trap the user.
    await logoutRequest().catch(() => {});
    navigate('/login', { replace: true });
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
  };
}
