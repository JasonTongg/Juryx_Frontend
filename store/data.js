import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  address: "0x0000000000000000000000000000000000000000",
};

const datas = createSlice({
  name: "Datas",
  initialState,
  reducers: {
    setAddress: (state, action) => {
      state.address = action.payload;
    }
  },
});

export default datas.reducer;
export const { setAddress } = datas.actions;
