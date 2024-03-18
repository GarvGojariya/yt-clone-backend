import { v2 as cloudinary } from "cloudinary";
import fs, { createWriteStream } from "fs";
import { createReadStream } from "fs";
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    timeout: 60000,
});

const uploadOnCloudinary = async (localFilePath, folder) => {
    try {
        if (!localFilePath) return null;
        //upload the file on clouudinary
        const responce = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: folder,
        });
        //upload sucessfull
        // console.log('file uploaded sucessfully', responce.url);
        fs.unlinkSync(localFilePath); //delete local copy of the image after it is uploaded to Cloudinary
        return responce;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
};

const uploadVideoOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Calculate file size
        const fileSizeInBytes = fs.statSync(localFilePath).size;

        // Define chunk size (e.g., 5MB)
        const chunkSize = 10 * 1024 * 1024; // 5MB in bytes

        // Calculate total number of chunks
        const totalChunks = Math.ceil(fileSizeInBytes / chunkSize);

        // Upload chunks sequentially
        let chunkIndex = 0;
        let uploadResponses = [];
        while (chunkIndex < totalChunks) {
            // Read chunk from file
            const startByte = chunkIndex * chunkSize;
            const endByte = Math.min(
                (chunkIndex + 1) * chunkSize,
                fileSizeInBytes
            );
            const chunkStream = createReadStream(localFilePath, {
                start: startByte,
                end: endByte - 1, // -1 to include endByte
            });
            // Upload chunk to Cloudinary
            const response = await new Promise((resolve, reject) => {
                const upload = cloudinary.uploader.upload_stream(
                    { resource_type: "auto", folder: "/vid" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                        console.log({ result });
                    }
                );

                // Pipe the chunk stream to the upload stream
                chunkStream.pipe(upload);

                // Handle end of chunk stream
                chunkStream.on("end", () => {
                    upload.end(); // End the upload stream
                });
            });
            // Save upload response
            uploadResponses.push(response);

            // Move to next chunk
            chunkIndex++;
        }

        // Delete the local file after successful upload
        await fs.unlinkSync(localFilePath);

        // Return array of Cloudinary upload responses
        return uploadResponses;
    } catch (error) {
        // Handle errors and clean up local file
        fs.unlinkSync(localFilePath);
        console.log("Deleted file successfully");
        return null;
    }
};

export { uploadOnCloudinary, uploadVideoOnCloudinary };
