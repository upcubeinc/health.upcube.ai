
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { usePreferences } from "@/contexts/PreferencesContext"; // Import usePreferences
import {
  addCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  CustomCategory,
} from "@/services/customCategoryService";


interface CustomCategoryManagerProps {
  categories: CustomCategory[];
  onCategoriesChange: (categories: CustomCategory[]) => void;
}

const CustomCategoryManager = ({ categories, onCategoriesChange }: CustomCategoryManagerProps) => {
  const { user } = useAuth();
  const { loggingLevel } = usePreferences(); // Destructure loggingLevel
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    measurement_type: '',
    frequency: 'Daily'
  });

  useEffect(() => {
    const fetchCategories = async () => {
      if (user) {
        try {
          const fetchedCategories = await getCategories(loggingLevel); // Pass loggingLevel
          onCategoriesChange(fetchedCategories);
        } catch (error) {
          console.error("Error fetching custom categories:", error);
          toast({
            title: "Error",
            description: "Failed to load custom categories.",
            variant: "destructive",
          });
        }
      }
    };
    fetchCategories();
  }, [user, onCategoriesChange]);

  const handleAddCategory = async () => {
    if (!user || !newCategory.name.trim() || !newCategory.measurement_type.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await addCategory({
        user_id: user.id,
        name: newCategory.name.trim(),
        measurement_type: newCategory.measurement_type.trim(),
        frequency: newCategory.frequency
      }, loggingLevel); // Pass loggingLevel
      onCategoriesChange([...categories, data]);
      setNewCategory({ name: '', measurement_type: '', frequency: 'Daily' });
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Custom category added successfully",
      });
    } catch (error) {
      console.error('Error adding custom category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add custom category",
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = async () => {
    if (!user || !editingCategory || !editingCategory.name.trim() || !editingCategory.measurement_type.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedData = await updateCategory(editingCategory.id, {
        name: editingCategory.name.trim(),
        measurement_type: editingCategory.measurement_type.trim(),
        frequency: editingCategory.frequency
      }, loggingLevel); // Pass loggingLevel
      onCategoriesChange(categories.map(cat => cat.id === editingCategory.id ? updatedData : cat));
      setEditingCategory(null);
      setIsEditDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Custom category updated successfully",
      });
    } catch (error) {
      console.error('Error updating custom category:', error);
      toast({
        title: "Error",
        description: "Failed to update custom category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const idToDelete = String(categoryId || ''); // Ensure it's a string here, fallback to empty
    if (!idToDelete || idToDelete === 'undefined' || idToDelete === 'null') {
      console.error('Attempted to delete a category with an invalid ID:', idToDelete);
      toast({
        title: "Error",
        description: "Cannot delete category: Invalid ID.",
        variant: "destructive",
      });
      return;
    }

    if (!user || !user.id) {
      console.error('User or User ID is missing for delete operation.');
      toast({
        title: "Error",
        description: "Cannot delete category: User not authenticated.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteCategory(idToDelete, loggingLevel); // Pass loggingLevel
      onCategoriesChange(categories.filter(cat => cat.id !== idToDelete));
      
      toast({
        title: "Success",
        description: "Custom category deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting custom category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete custom category",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (category: CustomCategory) => {
    setEditingCategory({ ...category, id: String(category.id || '') }); // Ensure ID is string, fallback to empty
    setIsEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Custom Categories</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Category</DialogTitle>
                <DialogDescription>
                  Fill in the details for your new custom measurement category.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name (max 50 characters)</Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value.slice(0, 50) })}
                    placeholder="e.g., Blood Sugar"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="measurement_type">Measurement Type (max 50 characters)</Label>
                  <Input
                    id="measurement_type"
                    value={newCategory.measurement_type}
                    onChange={(e) => setNewCategory({ ...newCategory, measurement_type: e.target.value.slice(0, 50) })}
                    placeholder="e.g., mg/dL"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={newCategory.frequency}
                    onValueChange={(value) => setNewCategory({ ...newCategory, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All (unlimited entries)</SelectItem>
                      <SelectItem value="Daily">Daily (one per day)</SelectItem>
                      <SelectItem value="Hourly">Hourly (one per hour)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddCategory} className="w-full">
                  Add Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No custom categories yet. Add one to get started!</p>
        ) : (
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div key={category.id || `UNDEFINED_ID-${index}`} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-gray-500">
                    {category.measurement_type} • {category.frequency}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(category)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Custom Category</DialogTitle>
              <DialogDescription>
                Update the details for your custom measurement category.
              </DialogDescription>
            </DialogHeader>
            {editingCategory && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name (max 50 characters)</Label>
                  <Input
                    id="edit-name"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value.slice(0, 50) })}
                    placeholder="e.g., Blood Sugar"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-measurement_type">Measurement Type (max 50 characters)</Label>
                  <Input
                    id="edit-measurement_type"
                    value={editingCategory.measurement_type}
                    onChange={(e) => setEditingCategory({ ...editingCategory, measurement_type: e.target.value.slice(0, 50) })}
                    placeholder="e.g., mg/dL"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-frequency">Frequency</Label>
                  <Select
                    value={editingCategory.frequency}
                    onValueChange={(value) => setEditingCategory({ ...editingCategory, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All (unlimited entries)</SelectItem>
                      <SelectItem value="Daily">Daily (one per day)</SelectItem>
                      <SelectItem value="Hourly">Hourly (one per hour)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleEditCategory} className="w-full">
                  Update Category
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CustomCategoryManager;
