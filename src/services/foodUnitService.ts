import { apiCall } from './api';

import { Food, FoodVariant } from '@/types/food';

export const loadFoodVariants = async (foodId: string): Promise<FoodVariant[]> => {
  return apiCall(`/foods/food-variants?food_id=${foodId}`, {
    method: 'GET',
    suppress404Toast: true, // Suppress toast for 404 errors
  });
};