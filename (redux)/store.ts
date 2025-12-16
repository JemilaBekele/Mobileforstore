import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";// Import the product batches reducer
import userSellsReducer from "./sell"
import dashboardReducer from "./dashboard";
import productsSlice from "./product"
import sellDeliveryReducer from "./delivery";// Import the product batches reducer
const store = configureStore({
  reducer: {
    auth: authReducer, // Make sure this line exists
        userSells: userSellsReducer, // Add the user sells reducer
    userDashboard: dashboardReducer,
    products: productsSlice ,
    sellDelivery: sellDeliveryReducer, // Add the product batches reducer

  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
