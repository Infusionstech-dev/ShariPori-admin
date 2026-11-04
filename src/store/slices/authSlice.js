import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  admin: null,
  accessToken: null,
  permissions: [],
  status: 'idle', // idle | checking | authenticated | guest | unavailable
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionCheckStarted: (state) => {
      state.status = 'checking';
    },
    // The session could not be checked (rate limit or network), which does not mean it ended.
    sessionUnavailable: (state) => {
      state.status = 'unavailable';
    },
    setCredentials: (state, action) => {
      const { admin, accessToken, permissions } = action.payload;
      state.admin = admin;
      state.accessToken = accessToken;
      state.permissions = permissions;
      state.status = 'authenticated';
    },
    logout: (state) => {
      state.admin = null;
      state.accessToken = null;
      state.permissions = [];
      state.status = 'guest';
    },
  },
});

export const { sessionCheckStarted, sessionUnavailable, setCredentials, logout } =
  authSlice.actions;
export default authSlice.reducer;
