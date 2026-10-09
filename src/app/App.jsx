import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BrandPreviewPage from './BrandPreviewPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BrandPreviewPage />} />
      </Routes>
    </BrowserRouter>
  )
}
