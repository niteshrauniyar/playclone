import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadFileCloud} from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken}



    } catch (error) {
        throw new ApiError(500,"something went wrong generating access and refresh token")
    }
}



const registerUser = asyncHandler( async(req,res) => {
 //get user detailed from frontend
 //validation--not empty
 //check if user already exits: username,email
 //check for images and avator
 //upload them to cloudinary,avator 
 //create user object- create entry in db
 //remove password and refresh token field from response
 //check for user creation 
 //return response  

const {fullName,email , username , password} = req.body

if (
    [fullName,email,username,password].some((field) =>
    field?.trim() === "")
) {
throw new ApiError(400,"all field is required")
}

const existedUser = await User.findOne({
    $or: [{username},{email}]
})

if (existedUser) {
    throw new ApiError(409,"User already exists")
}
const avatorlocalpath =req.files?.avator[0]?.path
//const coverimagelocalpath = req.files?.coverimage[0]?.path

let coverimagelocalpath;
if (req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0) {
    coverimagelocalpath = req.files.coverimage[0].path    
}

if (!avatorlocalpath) {
    throw new ApiError(400,"avator image is  required")
}

const avator = await uploadFileCloud(avatorlocalpath)
const coverimage =  await uploadFileCloud(coverimagelocalpath)

if (!avator) {
    throw new ApiError(400 , "avator image is required")
}

const user =  await User.create({
    fullName,
    avator: avator.url,
    coverimage: coverimage?.url || "",
    password,
    email,
    username: username.toLowerCase()
})
const createdUser = await User.findById(user._id).select(
    "-password -refreshtoken"
)
if (!createdUser) {
    throw new ApiError(500, "something went wrong")
} 

return res.status(201).json(
    new ApiResponse(200, createdUser , "User register successfully")
)


})

const loginUser = asyncHandler(async(req,res) => {
    const {email,username,password} = req.body
    if (!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    
    if (!user) {
     throw new ApiError(404, "User does not exixt")   
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")

    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
     
    const options = {
        httpOnly: true,
        secure: true
    }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken , options)
  .json
(  new ApiResponse(
    200,
    {
        user: loggedInUser,accessToken,refreshToken
    },
    "User logged In successfully"
  ))

})


const logoutUser = asyncHandler(async(req,res) => {
 await User.findByIdAndUpdate(
    req.user._id,
    {
        $unset: {
            refreshToken: 1
        }
    },
    {
        new:true
    }
 ) 
 
 const options = {
    httpOnly: true,
    secure: true
 }

return res
.status(200)
.clearCookie("accessToken", options)
.clearCookie("refreshToken", options)
.json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken  = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
 if(!incomingRefreshToken) {
    throw new ApiError(401,"unauthorized request")
 }
 try {
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.ACCESS_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)

   if (!user) {
    throw new ApiError(401, "Invalid refresh token")
   }

   if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401,"Refresh token is experied or used")
   }
  
   const options ={
    httpOnly:true,
    secure: true
   }

   const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

   return res 
   .status(200)
   .cookie("accessToken", accessToken , options)
   .cookie("refreshToken", newRefreshToken, options)
   .json(
    new ApiResponse(
        200,
        {accessToken,refreshToken: newRefreshToken},
        "Access token refreshed"
    )
   )


 } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
 }

})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body


    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password chnaged successfully"))

})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName ,email} = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")
     
    return res
    .status(200)
    .json(new ApiResponse(200, user , "Account details updated successfully"))

});


const updateUserAvator = asyncHandler(async(req,res) => {
    const avatorlocalpath = req.file?.path
    if(!avatorlocalpath) {
        throw new ApiError(400,"Avator is missing")
    }

//TODO: delete old I=image
const avator = await uploadFileCloud(avatorlocalpath)

if (!avator.url) {
    throw new ApiError(400,"Error while uploading on avator")

}

const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set: {
            avator: avator.url
        }
    },
    {new: true}
).select("-password")
return res
.status(200)
.json(
    new ApiResponse(200, user,"Avator image updated succefully")
)

})



const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverimagelocalpath = req.file?.path
    if(!coverimagelocalpath){
        throw new ApiError(400,"Cover image file is missing")
    }


//Todo: delete old image - assignment

const coverimage = await uploadFileCloud(coverimagelocalpath)

if(!coverimage.url) {
    throw new ApiError(400, "Error while uploading on avator")

}
const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            coverimage: coverimage.url
        }
    },
    {new: true}
).select("-password")

return res
.status(200)
.json(
    new ApiResponse(200, user , "Cover image update successfully ")
)



})

const getUserChannelProfile = asyncHandler(async(req,res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "username id missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup :{
                from :"subscription",
                localField: "_id",
                foreignField: "channel",
                as: "subscriber"

            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subbsctbercount: {
                    $size : "$subscribers"
                },
                channelSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                    isSubscribed: {
                        $cond: {
                            if: {$in : [req.user?._id ,  "$subscribers.subscriber"]},
                          then: true,
                          else: false
                        }
                    }
                
            }
        },

  {       $project: {
            fullName: 1,
            username: 1,
            subbsctbercount: 1,
            channelSubscribedToCount: 1,
            isSubscribed: 1,
            avator: 1,
            coverimage: 1,
            email: 1


         }}
    ])

    if (!channel?.length) {
        throw new ApiError(404, "chnanel does not exixts")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )

})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from: "videos",
                localField: "wacthHistory",
                foreignField: "_id",
                as: "watchHistory",
                as: "watchHistory",
                pipeline : [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                           foreignField: "_id",
                           as: "owner",
                           pipeline: [
                            {
                                $project : {
                                    fullName: 1,
                                    username: 1,
                                    avator: 1
                                }
                            }
                           ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json (
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvator,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}