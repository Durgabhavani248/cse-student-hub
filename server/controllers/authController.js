export const login = async (req, res) => {
  try {
    // Login logic here
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};