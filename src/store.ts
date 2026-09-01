import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './features/apis/apiSlice';
import authReducer, { logout, setCredentials } from './features/slice/authSlice';

const appReducer = combineReducers({
  [apiSlice.reducerPath]: apiSlice.reducer,
  auth: authReducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === logout.type || action.type === setCredentials.type) {
    // When logging out or switching credentials, reset all in-memory API query cache
    state = {
      ...state,
      [apiSlice.reducerPath]: undefined,
    };
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(apiSlice.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
