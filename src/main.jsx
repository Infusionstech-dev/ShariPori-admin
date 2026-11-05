import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, ConfigProvider } from 'antd';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import AppRoutes from './routes/AppRoutes';
import { store } from './store/store';
import theme from './theme';
import './index.css';

// A data router, which the unsaved-changes warning needs. AppRoutes still declares the routes.
const router = createBrowserRouter([{ path: '*', element: <AppRoutes /> }]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <App>
          <RouterProvider router={router} />
        </App>
      </ConfigProvider>
    </Provider>
  </StrictMode>
);
