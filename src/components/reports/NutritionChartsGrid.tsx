
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ZoomableChart from "../ZoomableChart";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { debug, info, warn, error } from "@/utils/logging";
import { parseISO } from "date-fns"; // Import parseISO

interface NutritionData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturated_fat: number;
  polyunsaturated_fat: number;
  monounsaturated_fat: number;
  trans_fat: number;
  cholesterol: number;
  sodium: number;
  potassium: number;
  dietary_fiber: number;
  sugars: number;
  vitamin_a: number;
  vitamin_c: number;
  calcium: number;
  iron: number;
}

interface NutritionChartsGridProps {
  nutritionData: NutritionData[];
}

const NutritionChartsGrid = ({ nutritionData }: NutritionChartsGridProps) => {
  const { loggingLevel, formatDateInUserTimezone, nutrientDisplayPreferences } = usePreferences(); // Destructure formatDateInUserTimezone
  const isMobile = useIsMobile();
  const platform = isMobile ? 'mobile' : 'desktop';
  const reportChartPreferences = nutrientDisplayPreferences.find(p => p.view_group === 'report_chart' && p.platform === platform);
  
  info(loggingLevel, 'NutritionChartsGrid: Rendering component.');

  const formatDateForChart = (dateStr: string) => {
    return formatDateInUserTimezone(parseISO(dateStr), 'MMM dd');
  };

  const allNutritionCharts = [
    { key: 'calories', label: 'Calories', color: '#8884d8', unit: 'cal' },
    { key: 'protein', label: 'Protein', color: '#82ca9d', unit: 'g' },
    { key: 'carbs', label: 'Carbs', color: '#ffc658', unit: 'g' },
    { key: 'fat', label: 'Fat', color: '#ff7300', unit: 'g' },
    { key: 'saturated_fat', label: 'Saturated Fat', color: '#ff6b6b', unit: 'g' },
    { key: 'polyunsaturated_fat', label: 'Polyunsaturated Fat', color: '#4ecdc4', unit: 'g' },
    { key: 'monounsaturated_fat', label: 'Monounsaturated Fat', color: '#45b7d1', unit: 'g' },
    { key: 'trans_fat', label: 'Trans Fat', color: '#f9ca24', unit: 'g' },
    { key: 'cholesterol', label: 'Cholesterol', color: '#eb4d4b', unit: 'mg' },
    { key: 'sodium', label: 'Sodium', color: '#6c5ce7', unit: 'mg' },
    { key: 'potassium', label: 'Potassium', color: '#a29bfe', unit: 'mg' },
    { key: 'dietary_fiber', label: 'Dietary Fiber', color: '#fd79a8', unit: 'g' },
    { key: 'sugars', label: 'Sugars', color: '#fdcb6e', unit: 'g' },
    { key: 'vitamin_a', label: 'Vitamin A', color: '#e17055', unit: 'μg' },
    { key: 'vitamin_c', label: 'Vitamin C', color: '#00b894', unit: 'mg' },
    { key: 'calcium', label: 'Calcium', color: '#0984e3', unit: 'mg' },
    { key: 'iron', label: 'Iron', color: '#2d3436', unit: 'mg' }
  ];

  const visibleCharts = reportChartPreferences
    ? allNutritionCharts.filter(chart => reportChartPreferences.visible_nutrients.includes(chart.key))
    : allNutritionCharts;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleCharts.map((chart) => (
        <ZoomableChart key={chart.key} title={`${chart.label} (${chart.unit})`}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{chart.label} ({chart.unit})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={nutritionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      tickFormatter={formatDateForChart} // Apply formatter
                    />
                    <YAxis
                      fontSize={10}
                      tickFormatter={(value: number) => {
                        if (chart.unit === 'g') {
                          return value.toFixed(1);
                        } else if (chart.unit === 'mg') {
                          return value.toFixed(2);
                        } else if (chart.unit === 'cal' || chart.unit === 'μg') {
                          return Math.round(value).toString();
                        } else {
                          return Math.round(value).toString(); // Default to rounding for other units
                        }
                      }}
                    />
                    <Tooltip
                      labelFormatter={(value) => formatDateForChart(value as string)} // Apply formatter
                      formatter={(value: number | string | null | undefined) => {
                        if (value === null || value === undefined) {
                          return ['N/A'];
                        }
                        let numValue: number;
                        if (typeof value === 'string') {
                          numValue = parseFloat(value); // Parse string to number
                        } else if (typeof value === 'number') {
                          numValue = value;
                        } else {
                          return ['N/A']; // Should not happen if types are correct
                        }

                        let formattedValue: string;
                        if (chart.unit === 'g') {
                          formattedValue = numValue.toFixed(1);
                        } else if (chart.unit === 'mg') {
                          formattedValue = numValue.toFixed(2);
                        } else if (chart.unit === 'cal' || chart.unit === 'μg') {
                          formattedValue = Math.round(numValue).toString();
                        }
                        else {
                          formattedValue = Math.round(numValue).toString();
                        }
                        return [`${formattedValue} ${chart.unit}`];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={chart.key}
                      stroke={chart.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </ZoomableChart>
      ))}
    </div>
  );
};

export default NutritionChartsGrid;
