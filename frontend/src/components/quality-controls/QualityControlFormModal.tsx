import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, User, MapPin } from 'lucide-react';
import { qualityService } from '@/services/quality.service';
import { productService } from '@/services/product.service';
import { inventoryService } from '@/services/inventory.service';
import { locationService } from '@/services/location.service';
import { QualityControl, InspectionResult, Item } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { toast } from 'react-hot-toast';

interface QualityControlFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  qualityControl?: QualityControl | null;
}

interface Location {
  id: string;
  code: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  level?: string;
  bin?: string;
  type: string;
  warehouseName?: string;
}

export const QualityControlFormModal: React.FC<QualityControlFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  qualityControl
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingLots, setLoadingLots] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // ✅ AUTO-POPULATED Inspector ID from localStorage
  const [currentInspectorId, setCurrentInspectorId] = useState<string>('');

  const [formData, setFormData] = useState<Partial<QualityControl>>({
    itemId: '',
    lotId: '',
    serialNumber: '',
    quantityInspected: 1, // ✅ Default to 1 (backend requires @Positive)
    inspectionType: 'INCOMING',
    status: 'PENDING',
    inspectorId: '',
    inspectionLocationId: '',
    scheduledDate: '',
    defectCount: 0,
    inspectorNotes: '',
    correctiveAction: '',
    inspectionResults: []
  });
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [inspectionResults, setInspectionResults] = useState<InspectionResult[]>([]);

  // ============================================================================
  // EFFECTS - Data Loading
  // ============================================================================

  // ✅ Load inspector ID from JWT token or localStorage
 useEffect(() => {
  const loadInspectorId = () => {
    try {
      console.log('🔍 Attempting to load inspector ID...');

      // Method 1: Get user from localStorage FIRST (most reliable)
      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        console.log('👤 User object:', user);
        
        const inspectorId = user.id || user.userId || user.sub || user.user_id || '';
        
        if (inspectorId && inspectorId.trim() !== '') {
          setCurrentInspectorId(inspectorId);
          setFormData(prev => ({ ...prev, inspectorId: inspectorId }));
          console.log('✅ Inspector ID loaded:', inspectorId);
          return;
        }
      }

      // Method 2: Try JWT token
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const inspectorId = payload.sub || payload.userId || payload.id || payload.user_id || '';
          
          if (inspectorId && inspectorId.trim() !== '') {
            setCurrentInspectorId(inspectorId);
            setFormData(prev => ({ ...prev, inspectorId: inspectorId }));
            console.log('✅ Inspector ID from JWT:', inspectorId);
            return;
          }
        } catch (jwtError) {
          console.warn('⚠️ Could not decode JWT');
        }
      }

      // Method 3: Direct userId in localStorage
      const directUserId = localStorage.getItem('userId') || localStorage.getItem('user_id');
      if (directUserId) {
        setCurrentInspectorId(directUserId);
        setFormData(prev => ({ ...prev, inspectorId: directUserId }));
        console.log('✅ Inspector ID from localStorage:', directUserId);
        return;
      }

      console.error('❌ Could not find inspector ID');
      toast.error('Please enter your Inspector ID manually');
    } catch (error) {
      console.error('❌ Error loading inspector ID:', error);
      toast.error('Please enter your Inspector ID manually');
    }
  };

  if (isOpen) {
    loadInspectorId();
  }
}, [isOpen]);
  // ✅ Load items and locations when modal opens
  useEffect(() => {
    if (isOpen) {
      loadItems();
      loadLocations();
    }
  }, [isOpen]);

  // ✅ Load lots when item is selected
  useEffect(() => {
    if (formData.itemId) {
      loadLots(formData.itemId);
    } else {
      setLots([]);
    }
  }, [formData.itemId]);

  // ✅ Load existing quality control data for editing
  useEffect(() => {
    if (qualityControl) {
      setFormData({
        ...qualityControl,
        scheduledDate: qualityControl.scheduledDate?.split('T')[0] || ''
      });
      setInspectionResults(qualityControl.inspectionResults || []);
    } else {
      resetForm();
    }
  }, [qualityControl, isOpen]);

  // ============================================================================
  // DATA LOADING FUNCTIONS
  // ============================================================================

  // ✅ Load Items from API
  const loadItems = async () => {
    setLoadingItems(true);
    try {
      const response = await productService.getItems({ page: 0, size: 1000 });
      const itemsList = Array.isArray(response) ? response : (response?.content || []);
      setItems(itemsList);
      console.log('✅ Items loaded:', itemsList.length);
    } catch (error) {
      console.error('❌ Failed to load items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoadingItems(false);
    }
  };

  // ✅ Load Lots for selected item
  const loadLots = async (itemId: string) => {
    setLoadingLots(true);
    try {
      const response = await inventoryService.getLotsByItem(itemId);
      const lotsList = Array.isArray(response) ? response : (response?.content || response?.data || []);
      setLots(lotsList);
      console.log('✅ Lots loaded:', lotsList.length);
    } catch (error) {
      console.error('❌ Failed to load lots:', error);
      setLots([]);
    } finally {
      setLoadingLots(false);
    }
  };

  // ✅ Load Locations from API (CRITICAL FIX - NEW)
  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await locationService.getLocations({ page: 0, size: 1000 });
      const locationsList = Array.isArray(response) ? response : (response?.content || []);
      setLocations(locationsList);
      console.log('✅ Locations loaded:', locationsList.length);
    } catch (error) {
      console.error('❌ Failed to load locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const resetForm = () => {
    setFormData({
      itemId: '',
      lotId: '',
      serialNumber: '',
      quantityInspected: 1, // ✅ Default to 1 (backend requires @Positive)
      inspectionType: 'INCOMING',
      status: 'PENDING',
      inspectorId: currentInspectorId, // ✅ Keep inspector ID
      inspectionLocationId: '',
      scheduledDate: '',
      defectCount: 0,
      inspectorNotes: '',
      correctiveAction: '',
      inspectionResults: []
    });
    setInspectionResults([]);
    setAttachments([]);
    setLots([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  // ============================================================================
  // INSPECTION RESULTS MANAGEMENT
  // ============================================================================

  const addInspectionResult = () => {
    setInspectionResults(prev => [
      ...prev,
      {
        testParameter: '',
        expectedValue: '',
        actualValue: '',
        unitOfMeasure: '',
        minValue: 0,
        maxValue: 0,
        isPassed: false,
        defectType: '',
        defectSeverity: 'MINOR',
        remarks: '',
        sequenceOrder: prev.length + 1
      }
    ]);
  };

  const updateInspectionResult = (index: number, field: string, value: any) => {
    setInspectionResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeInspectionResult = (index: number) => {
    setInspectionResults(prev => prev.filter((_, i) => i !== index));
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ FIX: Only send fields that backend expects for creation
      const submitData: any = {
        itemId: formData.itemId,
        lotId: formData.lotId || undefined,
        serialNumber: formData.serialNumber || undefined,
        quantityInspected:  Number(formData.quantityInspected),
        inspectionType: formData.inspectionType,
        qualityProfileId: formData.qualityProfileId || undefined,
        samplingPlanId: formData.samplingPlanId || undefined,
        inspectorId: formData.inspectorId,
        inspectionLocationId: formData.inspectionLocationId || undefined,
        scheduledDate: formData.scheduledDate || undefined,
        quarantineId: formData.quarantineId || undefined,
      };

      // Remove undefined fields and empty strings
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === undefined || submitData[key] === '') {
          delete submitData[key];
        }
      });

     const finalInspectorId = formData.inspectorId?.trim() || currentInspectorId?.trim() || '';

if (!finalInspectorId || finalInspectorId === '') {
  console.error('❌ Inspector ID validation failed!');
  console.log('formData.inspectorId:', formData.inspectorId);
  console.log('currentInspectorId:', currentInspectorId);
  toast.error('Inspector ID is required. Please enter it manually or log in again.', { duration: 5000 });
  setLoading(false);
  return;
}

console.log('✅ Inspector ID validated:', finalInspectorId);

// Update submitData to use validated inspector ID
submitData.inspectorId = finalInspectorId;
      console.log('📤 Submitting Quality Control:', submitData);

      let response;
      if (qualityControl) {
        // Update existing - include additional fields
        const updateData = {
          ...submitData,
          status: formData.status,
          defectCount: formData.defectCount,
          inspectorNotes: formData.inspectorNotes,
          correctiveAction: formData.correctiveAction,
          inspectionResults: inspectionResults
        };
        response = await qualityService.updateQualityControl(qualityControl.id, updateData);
        toast.success('Quality control updated successfully');
      } else {
        // Create new - only required fields
        response = await qualityService.createQualityControl(submitData);
        console.log('✅ Quality control created:', response);
        toast.success('Quality control created successfully');
      }

      // Upload attachments if any
      if (attachments.length > 0 && response && typeof response === 'object' && 'id' in response) {
        console.log('📎 Uploading attachments...');
        const qualityControlId = (response as any).id as string;
        for (const file of attachments) {
          await qualityService.uploadAttachment(
            file,
            qualityControlId,
            undefined,
            `Inspection attachment for ${qualityControlId}`,
            'DOCUMENT'
          );
        }
        console.log('✅ Attachments uploaded');
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save quality control');
      console.error('❌ Quality control save error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isOpen) return null;

  const selectedItem = items.find(item => item.id === formData.itemId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto m-4">
        {/* ================================================================ */}
        {/* HEADER */}
        {/* ================================================================ */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {qualityControl ? 'Edit Quality Control' : 'Create Quality Control'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* ================================================================ */}
        {/* FORM */}
        {/* ================================================================ */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* ============================================================== */}
          {/* INSPECTOR ID INFO BOX (AUTO-FILLED) */}
          {/* ============================================================== */}
          {/* ============================================================== */}
          {/* INSPECTOR ID - AUTO FROM AUTHENTICATION */}
          {/* ============================================================== */}
          {currentInspectorId ? (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <User className="text-green-600 dark:text-green-400 mt-1" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                    Inspector ID <span className="text-green-600">(Auto-detected from authentication)</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-700 font-mono text-sm flex-1">
                      {currentInspectorId}
                    </code>
                    <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    ✅ Automatically loaded from your login session
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <User className="text-yellow-600 dark:text-yellow-400 mt-1" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    Inspector ID <span className="text-red-500">*REQUIRED*</span>
                  </p>
                  <Input
                    type="text"
                    name="inspectorId"
                    value={formData.inspectorId || ''}
                    onChange={handleChange}
                    required
                    placeholder="Enter your Inspector ID"
                    className="font-mono"
                  />
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    ⚠️ Could not auto-load from authentication. Please enter manually.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* BASIC INFORMATION */}
          {/* ============================================================== */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Item Selection Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Item / Product <span className="text-red-500">*</span>
                </label>
                <Select
                  name="itemId"
                  value={formData.itemId}
                  onChange={handleChange}
                  required
                  disabled={loadingItems}
                >
                  <option value="">
                    {loadingItems ? 'Loading items...' : 'Select an item'}
                  </option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.sku ? `(${item.sku})` : ''}
                    </option>
                  ))}
                </Select>
                {selectedItem && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    SKU: {selectedItem.sku || 'N/A'}
                  </p>
                )}
              </div>

              {/* Lot Selection Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lot / Batch Number
                </label>
                <Select
                  name="lotId"
                  value={formData.lotId || ''}
                  onChange={handleChange}
                  disabled={!formData.itemId || loadingLots}
                >
                  <option value="">
                    {!formData.itemId
                      ? 'Select an item first'
                      : loadingLots
                      ? 'Loading lots...'
                      : lots.length === 0
                      ? 'No lots available'
                      : 'Select a lot (optional)'}
                  </option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lotNumber || lot.batchNumber || lot.id}
                      {lot.expiryDate ? ` (Exp: ${lot.expiryDate})` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Serial Number
                </label>
                <Input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber || ''}
                  onChange={handleChange}
                  placeholder="Optional serial number"
                />
              </div>

              {/* Quantity Inspected */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity Inspected <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  name="quantityInspected"
                  value={formData.quantityInspected || 0}
                  onChange={handleNumberChange}
                  required
                  min="1"
                  placeholder="Enter quantity"
                />
              </div>

              {/* Inspection Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspection Type <span className="text-red-500">*</span>
                </label>
                <Select
                  name="inspectionType"
                  value={formData.inspectionType}
                  onChange={handleChange}
                  required
                >
                  <option value="INCOMING">Incoming Inspection</option>
                  <option value="IN_PROCESS">In-Process Inspection</option>
                  <option value="FINAL_INSPECTION">Final Inspection</option>
                  <option value="RANDOM_AUDIT">Random Audit</option>
                  <option value="CUSTOMER_RETURN">Customer Return</option>
                  <option value="PROCESS_INSPECTION">Process Inspection</option>
                </Select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                  <option value="QUARANTINED">Quarantined</option>
                  <option value="CONDITIONAL_ACCEPT">Conditional Accept</option>
                </Select>
              </div>

              {/* ✅ FIXED: Location Dropdown (was text input) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin size={16} />
                  Inspection Location
                </label>
                <Select
                  name="inspectionLocationId"
                  value={formData.inspectionLocationId || ''}
                  onChange={handleChange}
                  disabled={loadingLocations}
                >
                  <option value="">
                    {loadingLocations ? 'Loading locations...' : 'Select a location (optional)'}
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.code} - {location.warehouseName || 'N/A'} ({location.type})
                    </option>
                  ))}
                </Select>
                {formData.inspectionLocationId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {locations.find(loc => loc.id === formData.inspectionLocationId)?.code || 'Selected location'}
                  </p>
                )}
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scheduled Date
                </label>
                <Input
                  type="date"
                  name="scheduledDate"
                  value={formData.scheduledDate || ''}
                  onChange={handleChange}
                />
              </div>

              {/* Defect Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Defect Count
                </label>
                <Input
                  type="number"
                  name="defectCount"
                  value={formData.defectCount || 0}
                  onChange={handleNumberChange}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* INSPECTION RESULTS */}
          {/* ============================================================== */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inspection Results</h3>
              <Button type="button" onClick={addInspectionResult} className="flex items-center gap-2">
                <Plus size={16} />
                Add Test
              </Button>
            </div>

            {inspectionResults.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No inspection results added yet. Click "Add Test" to add test parameters.
              </p>
            ) : (
              <div className="space-y-4">
                {inspectionResults.map((result, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">Test #{index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeInspectionResult(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Test Parameter</label>
                        <Input
                          type="text"
                          value={result.testParameter}
                          onChange={(e) => updateInspectionResult(index, 'testParameter', e.target.value)}
                          placeholder="e.g., Weight, Length"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Expected Value</label>
                        <Input
                          type="text"
                          value={result.expectedValue || ''}
                          onChange={(e) => updateInspectionResult(index, 'expectedValue', e.target.value)}
                          placeholder="Expected value"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Actual Value</label>
                        <Input
                          type="text"
                          value={result.actualValue || ''}
                          onChange={(e) => updateInspectionResult(index, 'actualValue', e.target.value)}
                          placeholder="Actual value"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Unit of Measure</label>
                        <Input
                          type="text"
                          value={result.unitOfMeasure || ''}
                          onChange={(e) => updateInspectionResult(index, 'unitOfMeasure', e.target.value)}
                          placeholder="kg, cm, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Min Value</label>
                        <Input
                          type="number"
                          value={result.minValue || ''}
                          onChange={(e) => updateInspectionResult(index, 'minValue', parseFloat(e.target.value))}
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Max Value</label>
                        <Input
                          type="number"
                          value={result.maxValue || ''}
                          onChange={(e) => updateInspectionResult(index, 'maxValue', parseFloat(e.target.value))}
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Result</label>
                        <Select
                          value={result.isPassed ? 'true' : 'false'}
                          onChange={(e) => updateInspectionResult(index, 'isPassed', e.target.value === 'true')}
                        >
                          <option value="true">Passed</option>
                          <option value="false">Failed</option>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Defect Severity</label>
                        <Select
                          value={result.defectSeverity || 'MINOR'}
                          onChange={(e) => updateInspectionResult(index, 'defectSeverity', e.target.value)}
                        >
                          <option value="CRITICAL">Critical</option>
                          <option value="MAJOR">Major</option>
                          <option value="MINOR">Minor</option>
                        </Select>
                      </div>
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                        <Input
                          type="text"
                          value={result.remarks || ''}
                          onChange={(e) => updateInspectionResult(index, 'remarks', e.target.value)}
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* NOTES & ACTIONS */}
          {/* ============================================================== */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes & Actions</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspector Notes
                </label>
                <textarea
                  name="inspectorNotes"
                  value={formData.inspectorNotes || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter inspection notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Corrective Actions
                </label>
                <textarea
                  name="correctiveAction"
                  value={formData.correctiveAction || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter corrective actions..."
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* ATTACHMENTS (Only for new quality controls) */}
          {/* ============================================================== */}
          {!qualityControl && (
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attachments</h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-500">Upload files</span>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                {attachments.length > 0 && (
                  <div className="mt-4 text-left">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Selected Files ({attachments.length}):
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {attachments.map((file, index) => (
                        <li key={index}>• {file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* FORM ACTIONS */}
          {/* ============================================================== */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : qualityControl ? 'Update Quality Control' : 'Create Quality Control'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};