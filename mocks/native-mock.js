module.exports = {
  LLMModule: {
    fromCustomModel: async () => ({
      configure: () => {},
      forward: async () => "Mocked result",
      delete: () => {}
    })
  },
  InferenceSession: {
    create: async () => ({
      run: async () => ({})
    })
  },
  Tensor: class {
    constructor() {}
  }
};
