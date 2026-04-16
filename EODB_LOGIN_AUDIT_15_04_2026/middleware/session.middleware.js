exports.verifyLogin = async (req, res, next) => {
  if (req || req.session || req.session.mobile || req.session.isLogin || req.session.isLoggedIn) {
    next();
  } else {
    res.redirect("/eodb/login");
  }
};
