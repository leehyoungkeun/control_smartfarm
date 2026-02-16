/**
 * 앱 루트 컴포넌트
 */
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';

const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
