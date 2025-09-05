import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search,
  Edit,
  Trash2,
  Plus,
  Share2,
  Users,
  Filter,
} from "lucide-react";
import { useActiveUser } from "@/contexts/ActiveUserContext";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import EnhancedCustomFoodForm from "./EnhancedCustomFoodForm";
import FoodSearchDialog from "./FoodSearchDialog";
import FoodUnitSelector from "./FoodUnitSelector"; // Import FoodUnitSelector
import {
  loadFoods,
  togglePublicSharing,
  deleteFood as deleteFoodService,
  getFoodDeletionImpact,
  FoodFilter,
} from "@/services/foodService";
import { createFoodEntry } from "@/services/foodEntryService"; // Import foodEntryService
import { Food, FoodVariant, FoodDeletionImpact } from "@/types/food";
import MealManagement from "./MealManagement"; // Import MealManagement
import MealPlanCalendar from "./MealPlanCalendar"; // Import MealPlanCalendar

const FoodDatabaseManager: React.FC = () => {
  const { user } = useAuth();
  const { activeUserId } = useActiveUser();
  const { nutrientDisplayPreferences } = usePreferences();
  const isMobile = useIsMobile();
  const platform = isMobile ? "mobile" : "desktop";
  const quickInfoPreferences = nutrientDisplayPreferences.find(
    (p) => p.view_group === "quick_info" && p.platform === platform,
  );
  const visibleNutrients = quickInfoPreferences
    ? quickInfoPreferences.visible_nutrients
    : ["calories", "protein", "carbs", "fat"];
  const [foods, setFoods] = useState<Food[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFoodSearchDialog, setShowFoodSearchDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [foodFilter, setFoodFilter] = useState<FoodFilter>("all");
  const [sortOrder, setSortOrder] = useState<string>("name:asc");
  const [showFoodUnitSelectorDialog, setShowFoodUnitSelectorDialog] =
    useState(false); // New state
  const [foodToAddToMeal, setFoodToAddToMeal] = useState<Food | null>(null); // New state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletionImpact, setDeletionImpact] =
    useState<FoodDeletionImpact | null>(null);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);

  useEffect(() => {
    if (user && activeUserId) {
      // Always fetch foods when user and activeUserId are available
      fetchFoodsData();
    }
  }, [
    user,
    activeUserId,
    searchTerm,
    currentPage,
    itemsPerPage,
    foodFilter,
    sortOrder,
  ]); // Removed activeTab from dependencies

  useEffect(() => {
    const handleRefresh = () => fetchFoodsData();
    window.addEventListener("foodDatabaseRefresh", handleRefresh);
    return () => {
      window.removeEventListener("foodDatabaseRefresh", handleRefresh);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, foodFilter]);

  const fetchFoodsData = async () => {
    try {
      setLoading(true);

      const { foods: fetchedFoods, totalCount: fetchedTotalCount } =
        await loadFoods(
          searchTerm,
          foodFilter,
          currentPage,
          itemsPerPage,
          activeUserId,
          sortOrder, // Pass the new sortOrder
        );
      setFoods(fetchedFoods || []);
      setTotalCount(fetchedTotalCount || 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublicSharing = async (foodId: string, currentState: boolean) => {
    try {
      await togglePublicSharing(foodId, currentState);

      toast({
        title: "Success",
        description: !currentState
          ? "Food shared with public"
          : "Food made private",
      });

      fetchFoodsData();
    } catch (error: any) {
      console.error("Error:", error);
    }
  };

  const handleDeleteRequest = async (food: Food) => {
    if (!user || !activeUserId) return;
    try {
      const impact = await getFoodDeletionImpact(food.id);
      setDeletionImpact(impact);
      setFoodToDelete(food);
      setShowDeleteConfirmation(true);
    } catch (error) {
      console.error("Error fetching deletion impact:", error);
      toast({
        title: "Error",
        description: "Could not fetch deletion impact. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!foodToDelete || !activeUserId) return;
    try {
      await deleteFoodService(foodToDelete.id, activeUserId);
      toast({
        title: "Success",
        description: "Food deleted successfully.",
      });
      fetchFoodsData();
    } catch (error) {
      console.error("Error deleting food:", error);
      toast({
        title: "Error",
        description: "Failed to delete food.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirmation(false);
      setFoodToDelete(null);
      setDeletionImpact(null);
    }
  };

  const handleEdit = (food: Food) => {
    setEditingFood(food);
    setShowEditDialog(true);
  };

  const handleSaveComplete = (savedFood: Food) => {
    fetchFoodsData();
    setShowEditDialog(false);
    setEditingFood(null);
  };

  const handleFoodSelected = (food: Food) => {
    setShowFoodSearchDialog(false);
    fetchFoodsData();
    toast({
      title: "Food Added",
      description: `${food.name} has been added to your database.`,
    });
  };

  const handleAddFoodToMeal = async (
    food: Food,
    quantity: number,
    unit: string,
    selectedVariant: FoodVariant,
  ) => {
    if (!user || !activeUserId) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createFoodEntry({
        user_id: activeUserId,
        food_id: food.id!,
        meal_type: "breakfast", // Default to breakfast for now, or make dynamic
        quantity: quantity,
        unit: unit,
        entry_date: new Date().toISOString().split("T")[0], // Current date
        variant_id: selectedVariant.id || null,
      });

      toast({
        title: "Success",
        description: `${food.name} has been added to your meal.`,
      });
      setShowFoodUnitSelectorDialog(false);
      setFoodToAddToMeal(null);
    } catch (error: any) {
      console.error("Error adding food to meal:", error);
      toast({
        title: "Error",
        description: `Failed to add ${food.name} to meal.`,
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const canEdit = (food: Food) => {
    // Only allow editing if the user owns the food
    return food.user_id === user?.id;
  };

  const getFoodSourceBadge = (food: Food) => {
    if (!food.user_id) {
      return (
        <Badge variant="outline" className="text-xs w-fit">
          System
        </Badge>
      );
    }

    if (food.user_id === user?.id) {
      return (
        <Badge variant="secondary" className="text-xs w-fit">
          Your Food
        </Badge>
      );
    }

    if (food.shared_with_public) {
      return (
        <Badge
          variant="outline"
          className="text-xs w-fit bg-green-50 text-green-700"
        >
          Public
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="text-xs w-fit bg-blue-50 text-blue-700"
      >
        Family
      </Badge>
    );
  };

  const getFilterTitle = () => {
    switch (foodFilter) {
      case "all":
        return `All Foods (${totalCount})`;
      case "mine":
        return `My Foods (${totalCount})`;
      case "family":
        return `Family Foods (${totalCount})`;
      case "public":
        return `Public Foods (${totalCount})`;
      default:
        return `Foods (${totalCount})`;
    }
  };

  const getEmptyMessage = () => {
    switch (foodFilter) {
      case "all":
        return "No foods found";
      case "mine":
        return "No foods created by you found";
      case "family":
        return "No family foods found";
      case "public":
        return "No public foods found";
      default:
        return "No foods found";
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (!user || !activeUserId) {
    return <div>Please sign in to manage your food database.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Food Database Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Food Database</CardTitle>
          <Button
            className="whitespace-nowrap"
            onClick={() => setShowFoodSearchDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Food
          </Button>
        </CardHeader>
        <CardContent>
          {/* Controls in a single row: Search, Filter, Items per page, Add button */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-row flex-wrap items-center gap-4">
              {/* Search box */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search foods..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter dropdown */}
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={foodFilter} onValueChange={(value) => setFoodFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="mine">My Foods</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Sort by dropdown */}
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm">Sort by:</span>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name:asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name:desc">Name (Z-A)</SelectItem>
                    <SelectItem value="calories:asc">
                      Calories (Low to High)
                    </SelectItem>
                    <SelectItem value="calories:desc">
                      Calories (High to Low)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Items per page selector */}
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm">Items per page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div>Loading foods...</div>
          ) : (
            <>
              {foods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {getEmptyMessage()}
                </div>
              ) : (
                <div className="grid gap-3">
                  {foods.map((food) => (
                    <div
                      key={food.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                          <span className="font-medium">{food.name}</span>
                          {food.brand && (
                            <Badge
                              variant="secondary"
                              className="text-xs w-fit"
                            >
                              {food.brand}
                            </Badge>
                          )}
                          {getFoodSourceBadge(food)}
                          {food.shared_with_public && (
                            <Badge
                              variant="outline"
                              className="text-xs w-fit bg-green-50 text-green-700"
                            >
                              <Share2 className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          )}
                        </div>
                        <div
                          className={`grid grid-cols-${visibleNutrients.length} gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400`}
                        >
                          {visibleNutrients.map((nutrient) => (
                            <div key={nutrient}>
                              <span className="font-medium">
                                {(food.default_variant?.[
                                  nutrient as keyof FoodVariant
                                ] as number) || 0}
                              </span>{" "}
                              {nutrient.replace(/_/g, " ")}
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Per {food.default_variant?.serving_size || 0}{" "}
                          {food.default_variant?.serving_unit || ""}
                        </div>
                      </div>
                      {canEdit(food) && (
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              togglePublicSharing(
                                food.id,
                                food.shared_with_public || false,
                              )
                            }
                            title={
                              food.shared_with_public
                                ? "Make private"
                                : "Share with public"
                            }
                          >
                            {food.shared_with_public ? (
                              <Users className="w-4 h-4" />
                            ) : (
                              <Share2 className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(food)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRequest(food)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNumber)}
                        isActive={currentPage === pageNumber}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>

      {/* Meal Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Meal Management</CardTitle>
        </CardHeader>
        <CardContent>
          <MealManagement />
        </CardContent>
      </Card>

      {/* Meal Plan Calendar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Meal Plan Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MealPlanCalendar />
        </CardContent>
      </Card>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Food</DialogTitle>
            <DialogDescription>
              Edit the details of the selected food item.
            </DialogDescription>
          </DialogHeader>
          {editingFood && (
            <EnhancedCustomFoodForm
              food={editingFood}
              onSave={handleSaveComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* FoodUnitSelector Dialog */}
      {foodToAddToMeal && (
        <FoodUnitSelector
          food={foodToAddToMeal}
          open={showFoodUnitSelectorDialog}
          onOpenChange={setShowFoodUnitSelectorDialog}
          onSelect={handleAddFoodToMeal}
          showUnitSelector={false}
        />
      )}

      {deletionImpact && foodToDelete && (
        <ConfirmationDialog
          open={showDeleteConfirmation}
          onOpenChange={setShowDeleteConfirmation}
          onConfirm={confirmDelete}
          title={`Delete ${foodToDelete.name}?`}
          description={
            <div>
              <p>
                This will permanently delete the food and all associated data:
              </p>
              <ul className="list-disc pl-5 mt-2">
                <li>{deletionImpact.foodEntriesCount} diary entries</li>
                <li>{deletionImpact.mealFoodsCount} meal components</li>
                <li>{deletionImpact.mealPlansCount} meal plan entries</li>
                <li>
                  {deletionImpact.mealPlanTemplateAssignmentsCount} meal plan
                  template entries
                </li>
              </ul>
            </div>
          }
        />
      )}

      <FoodSearchDialog
        open={showFoodSearchDialog}
        onOpenChange={setShowFoodSearchDialog}
        onFoodSelect={handleFoodSelected}
        title="Add Food to Database"
        description="Search for foods to add to your personal database."
        hideDatabaseTab={true}
      />
    </div>
  );
};

export default FoodDatabaseManager;
