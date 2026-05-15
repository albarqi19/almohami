import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // السماح بـ subdomains المحلية للتجربة (lvh.me, *.localhost)
    allowedHosts: ['.lvh.me', '.localhost'],
  },
})
