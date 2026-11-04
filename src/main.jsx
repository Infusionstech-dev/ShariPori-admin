import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, ConfigProvider } from 'antd';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import AppRoutes from './routes/AppRoutes';
import { store } from './store/store';
import theme from './theme';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <App>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </App>
      </ConfigProvider>
    </Provider>
  </StrictMode>
);
