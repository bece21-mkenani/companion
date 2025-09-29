import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (_: Request, res: Response) => {
  res.send('Hello from backend ');
});
app.get('/test', async (_:Request, res:Response) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  res.json({ connected: true })
})
app.listen(3036, () => {
  console.log('Server running on http://localhost:3036');
});