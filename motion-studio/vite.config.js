import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()], server:{host:'0.0.0.0',allowedHosts:true,watch:{ignored:['**/storage/**','**/.scratch/**']}}, build:{outDir:'dist'}});
