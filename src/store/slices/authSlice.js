import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  admin: null,
  accessToken: null,
  status: 'idle', // idle | checking | authenticated | unauthenticated
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionCheckStarted: (state) => {
      state.status = 'checking';
    },
    setCredentials: (state, action) => {
      const { admin, accessToken } = action.payload;
      state.accessToken = accessToken;
      if (admin !== undefined) {
        state.admin = admin;
      }
      state.status = 'authenticated';
    },
    logout: (state) => {
      state.admin = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
    },
  },
});

export const { sessionCheckStarted, setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
