import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN , 
}));

//express configuration

app.use(express.json({limit:'20kb'}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser())

//route imports 
import userRouter from './routes/user.router.js';

//route declaration 

app.use('/api/v1/users', userRouter);
export { app };