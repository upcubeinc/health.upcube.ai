
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { updateFoodEntry } from "@/services/foodEntryService";

interface FoodEntry {
  id: string;
  food_id: string;
  meal_type: string;
  quantity: number;
  unit: string;
  custom_calories?: number;
  custom_protein?: number;
  custom_carbs?: number;
  custom_fat?: number;
  foods: {
    id: string;
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    saturated_fat?: number;
    polyunsaturated_fat?: number;
    monounsaturated_fat?: number;
    trans_fat?: number;
    cholesterol?: number;
    sodium?: number;
    potassium?: number;
    dietary_fiber?: number;
    sugars?: number;
    vitamin_a?: number;
    vitamin_c?: number;
    calcium?: number;
    iron?: number;
    serving_size: number;
    serving_unit: string;
  };
}

interface CustomNutritionFormProps {
  entry: FoodEntry;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const CustomNutritionForm = ({ entry, onSave, onCancel }: CustomNutritionFormProps) => {
  const [quantity, setQuantity] = useState(entry.quantity);
  const [unit, setUnit] = useState(entry.unit);
  const [loading, setLoading] = useState(false);

  // Fix: Calculate multiplier based on quantity vs original serving size, not just quantity
  const servingSize = entry.foods.serving_size || 100;
  const multiplier = quantity / servingSize;

  // Calculate all nutrition values based on the correct multiplier
  const calculatedValues = {
    calories: (entry.foods.calories * multiplier) || 0,
    protein: (entry.foods.protein * multiplier) || 0,
    carbs: (entry.foods.carbs * multiplier) || 0,
    fat: (entry.foods.fat * multiplier) || 0,
    saturated_fat: (entry.foods.saturated_fat * multiplier) || 0,
    polyunsaturated_fat: (entry.foods.polyunsaturated_fat * multiplier) || 0,
    monounsaturated_fat: (entry.foods.monounsaturated_fat * multiplier) || 0,
    trans_fat: (entry.foods.trans_fat * multiplier) || 0,
    cholesterol: (entry.foods.cholesterol * multiplier) || 0,
    sodium: (entry.foods.sodium * multiplier) || 0,
    potassium: (entry.foods.potassium * multiplier) || 0,
    dietary_fiber: (entry.foods.dietary_fiber * multiplier) || 0,
    sugars: (entry.foods.sugars * multiplier) || 0,
    vitamin_a: (entry.foods.vitamin_a * multiplier) || 0,
    vitamin_c: (entry.foods.vitamin_c * multiplier) || 0,
    calcium: (entry.foods.calcium * multiplier) || 0,
    iron: (entry.foods.iron * multiplier) || 0,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update the food entry with new quantity and unit
      await updateFoodEntry(entry.id, {
        quantity: quantity,
        unit: unit,
      });

      toast({
        title: "Success",
        description: "Food entry updated successfully",
      });

      // Trigger a refresh of the food diary
      window.dispatchEvent(new Event('foodDiaryRefresh'));
      
      onSave({
        quantity: quantity,
        unit: unit,
        calories: calculatedValues.calories,
        protein: calculatedValues.protein,
        carbs: calculatedValues.carbs,
        fat: calculatedValues.fat,
      });
    } catch (error) {
      console.error('Error updating food entry:', error);
      toast({
        title: "Error",
        description: "Failed to update food entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition Information for {entry.foods.name}</CardTitle>
        <p className="text-sm text-gray-600">
          Adjust the quantity to see the nutritional values update automatically.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Serving Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Main Macronutrients */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Macronutrients</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Calories</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.calories.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Protein (g)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.protein.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Carbs (g)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.carbs.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Fat (g)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.fat.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Fat Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fat Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Saturated Fat (g)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.saturated_fat.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Polyunsaturated Fat (g)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.polyunsaturated_fat.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Monounsaturated Fat (g)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.monounsaturated_fat.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Trans Fat (g)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.trans_fat.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Minerals and Other Nutrients */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Minerals & Other Nutrients</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Cholesterol (mg)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.cholesterol.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Sodium (mg)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.sodium.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Potassium (mg)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.potassium.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Dietary Fiber (g)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.dietary_fiber.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Sugars and Vitamins */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sugars & Vitamins</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Sugars (g)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.sugars.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Vitamin A (µg)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.vitamin_a.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Vitamin C (mg)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.vitamin_c.toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Calcium (mg)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.calcium.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Iron */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <Label>Iron (mg)</Label>
                <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                  {calculatedValues.iron.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Original Food Info for Reference */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Original Food Values (per {entry.foods.serving_size} {entry.foods.serving_unit}):</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div>{entry.foods.calories} cal</div>
              <div>{entry.foods.protein}g protein</div>
              <div>{entry.foods.carbs}g carbs</div>
              <div>{entry.foods.fat}g fat</div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomNutritionForm;
