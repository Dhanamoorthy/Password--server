import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import './db.js';  // Assuming this file sets up MongoDB connection
import { User } from './models/User.js';  // Assuming this file defines the User model
import nodemailer from 'nodemailer';






const app = express();
dotenv.config();


app.use(cors({
  origin: ['https://dulcet-custard-6a5a47.netlify.app/'],
  credentials: true, 
}));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());  // Middleware to parse JSON body
const randomString = Math.random().toString(36).substr(2, 8);

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ alert: 'User not found' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ email: existingUser.email, id: existingUser._id }, process.env.SECRET, { expiresIn: '1h' });

    res.status(200).json({ result: existingUser, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({status:'User not Registered!!'})
    }

    
    const secret = randomString + user.password;
    const token = jwt.sign({email:user.email, id:user._id},secret,{expiresIn: '5m'});
    const link =`https://password-server-7jsh.onrender.com/reset-password/${user._id}/${token}`
    

    console.log(link)
//     await user.save();
// console.log(randomString)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: 'Reset Your Password',
      text: link,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error sending email' });
      } else {
        return res.status(200).json({ message: 'Email sent' });
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});
// Assuming you've already set up express, dotenv, cors, bcrypt, jwt, mongoose (or other MongoDB setup), and nodemailer


app.get('/reset-password/:id/:token', async (req, res) => {
  const { id,token } = req.params;


console.log(req.params)



const oldUser = await User.findOne({_id:id});
if(!oldUser){
   return res.status(400).json({ status: "User not exists" });
}
const secret = randomString + oldUser.password;
try {
  const verify = jwt.verify(token,secret)
  res.render("index", { email: verify.email, status: "Not Verified" });
} catch (error) {
     res.status(400).json({ status: "Not verified" });
}
  // if (newPassword === '') {
  //   return res.status(400).json({ message: "Enter a new password" });
  // }

  // try {
  //   // Find user by token
  //   const user = await User.find({  userId:id});
    
  //   if (!user) {
  //     return res.status(400).json({ message: "Password reset token is invalid or has expired" });
  //   }

  //   // Hash the new password
  //   const salt = await bcrypt.genSalt(10);
  //   const hashedPassword = await bcrypt.hash(newPassword, salt);

  //   // Update the user's password and clear the reset token and expiration
  //   user.password = hashedPassword;
  //   user.resetPasswordToken = undefined;
  //   user.resetPasswordExpires = undefined;

  //   // Save the updated user
  //   await user.save();

  //   res.status(200).json({ message: "Password has been reset successfully" });
  // } catch (error) {
  //   console.error(error);
  //   res.status(500).json({ message: "Server error" });
  // }
});



app.post('/reset-password/:id/:token', async (req, res) => {
  const { id,token } = req.params;
  const { password } = req.body;
  


const oldUser = await User.findOne({_id:id});
if(!oldUser){
   return res.status(400).json({ status: "User not exists" });
}
const secret = randomString + oldUser.password;
try {
  const verify = jwt.verify(token,secret)
  const encryptedPassword = await bcrypt.hash(password, 10);
  await User.updateOne({
    _id:id
  },
{
  $set:{
    password:encryptedPassword,
  }
})
 return res.status(200).json({status:"Password Updated"})


} catch (error) {
     return res.status(400).json({ status: "Something Went Wrong" });
}
})
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})
