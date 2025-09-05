
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale } from "lucide-react";

interface BodyMeasurementsProps {
  weight?: number;
  neck?: number;
  waist?: number;
  hips?: number;
  steps?: number;
  weightUnit: string;
  measurementUnit: string;
  loading: boolean;
  onWeightChange: (value: number | undefined) => void;
  onNeckChange: (value: number | undefined) => void;
  onWaistChange: (value: number | undefined) => void;
  onHipsChange: (value: number | undefined) => void;
  onStepsChange: (value: number | undefined) => void;
  onSave: () => void;
}

const BodyMeasurements = ({
  weight,
  neck,
  waist,
  hips,
  steps,
  weightUnit,
  measurementUnit,
  loading,
  onWeightChange,
  onNeckChange,
  onWaistChange,
  onHipsChange,
  onStepsChange,
  onSave
}: BodyMeasurementsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Scale className="w-5 h-5 mr-2" />
          Body Measurements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="weight">Weight ({weightUnit})</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={weight || ''}
              onChange={(e) => onWeightChange(Number(e.target.value) || undefined)}
              placeholder={`Enter weight in ${weightUnit}`}
            />
          </div>
          
          <div>
            <Label htmlFor="neck">Neck ({measurementUnit})</Label>
            <Input
              id="neck"
              type="number"
              step="0.1"
              value={neck || ''}
              onChange={(e) => onNeckChange(Number(e.target.value) || undefined)}
              placeholder={`Enter neck measurement in ${measurementUnit}`}
            />
          </div>
          
          <div>
            <Label htmlFor="waist">Waist ({measurementUnit})</Label>
            <Input
              id="waist"
              type="number"
              step="0.1"
              value={waist || ''}
              onChange={(e) => onWaistChange(Number(e.target.value) || undefined)}
              placeholder={`Enter waist measurement in ${measurementUnit}`}
            />
          </div>
          
          <div>
            <Label htmlFor="hips">Hips ({measurementUnit})</Label>
            <Input
              id="hips"
              type="number"
              step="0.1"
              value={hips || ''}
              onChange={(e) => onHipsChange(Number(e.target.value) || undefined)}
              placeholder={`Enter hips measurement in ${measurementUnit}`}
            />
          </div>
          
          <div>
            <Label htmlFor="steps">Steps</Label>
            <Input
              id="steps"
              type="number"
              value={steps || ''}
              onChange={(e) => onStepsChange(Number(e.target.value) || undefined)}
              placeholder="Enter daily steps"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button onClick={onSave} disabled={loading} className="px-8 py-2 text-sm">
            {loading ? 'Saving...' : 'Save Measurements'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BodyMeasurements;
