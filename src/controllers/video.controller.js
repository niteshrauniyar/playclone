import mongoose,{isValidObjectId} from "mongoose";
import { Video } from "../models/video.models";
import { User } from "../models/user.models";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadFileCloud } from "../utils/Cloudinary";


const getAllVideos = asyncHandler(async(req,res) => {
    const {page= 1 , limit = 10 , query, sortBy , sortType , userId} = req.query
    //Todo: get all videos based on query, sort , pagination
})