import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  admin: null,
  accessToken: null,
  permissions: [],
  status: 'idle', // idle | checking | authenticated | guest
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionCheckStarted: (state) => {
      state.status = 'checking';
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

export const { sessionCheckStarted, setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
