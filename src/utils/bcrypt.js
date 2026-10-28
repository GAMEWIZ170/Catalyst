const hashPassword = async (password) => {
    try {
    const salt = await bycrypt.genSalt(12);
    const hashed = await bycrypt.hash(password, salt);
    return hashed;
    } catch (err) {
        console.log(err.message)
    }
   
}

module.exports = hashPassword;