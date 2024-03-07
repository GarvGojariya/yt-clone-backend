import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
const userSchema = new Schema(
    {
        userName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true // indexes the field for faster search
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        fullName: {
            type: String,
            trim: true,
            required: true,
            index: true
        },
        avatar: {
            type: String, //cloudenery url or any other store url
            required: true
        },
        coverImage: {
            type: String, //cloudenery url or any other store url
        },
        watchHistory: [
            {
                type: mongoose.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, "Why no password?"]
        },
        refreshToken: {
            type: String,
        }
    }, {
    timestamps: true // Saves createdAt and updatedAt as dates. Creates them in ISO 8601 format yyy
}
);

//encrypt password before save to data base 
//pre is mongoose hooks , it will call this function before saving the data
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next()
});

//varification of password for login 
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
};

//generate access token 
userSchema.methods.generateAccessToken = function () {

    console.log(this)
    console.log(process.env.ACCESS_TOKEN_SECRET)
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            userName: this.userName,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        },
    )
}

//generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        },
    )
}
export const User = mongoose.model('User', userSchema);