import {v2 as cloudinary} from "cloudinary";
import { log } from "console";
import fs from "fs";
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLODINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadFileCloud = async (localfilepath) => {

    try {
        if(!localfilepath) return null;
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto"
          })
       //file uplaod in the cloud 
    console.log("file have been succefully upload in th cloud" ,response.url)
    return response
    } catch (error) {
        fs.unlinkSync(localfilepath) //remove the locally saved temporay file if operation get failed
        return null
    }
}

export {uploadFileCloud}