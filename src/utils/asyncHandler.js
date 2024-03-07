const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
            .catch((error) => next(error));
    }
};

export  { asyncHandler }



//onether way to create asynchandler

//  const asyncHandaler = (fn) => async(req,res,next)=>{
//     try{
//         await fn(req,res,next);
//     } catch(err){
//         res.status(err.code || 500).json({
//             sucess: false,
//             message: err.message || 'Internal Server Error'
//         });
//     }
// };