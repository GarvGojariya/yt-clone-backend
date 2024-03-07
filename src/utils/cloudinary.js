import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on clouudinary
        const responce = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //upload sucessfull
        // console.log('file uploaded sucessfully', responce.url);
        fs.unlinkSync(localFilePath)//delete local copy of the image after it is uploaded to Cloudinary
        return responce;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export { uploadOnCloudinary };