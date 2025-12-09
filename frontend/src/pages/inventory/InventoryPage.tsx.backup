// frontend/src/pages/inventory/InventoryPage.tsx
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Package, TrendingUp, AlertTriangle, Archive, X } from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { productService } from '@/services/product.service';
import { locationService } from '@/services/location.service';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';

// ============================================================================
// INTERFACES
// ============================================================================

interface Inventory {
  id: string;
  itemId: string;
  warehouseId: string;
  locationId: string;
  lotId?: string;
  serialId?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityDamaged: number;
  availableQuantity: number;
  uom: string;
  status: string;
  unitCost?: number;
  expiryDate?: string;
  manufactureDate?: string;
  lastCountDate?: string;
  attributes?: string;
  createdAt: string;
  updatedAt: string;
}

interface EnrichedInventory extends Inventory {
  itemName?: string;
  itemSku?: string;
  warehouseName?: string;
  locationName?: string;
  lotNumber?: string;
  serialNumber?: string;
}

// ============================================================================
// MAIN INVENTORY PAGE COMPONENT
// ============================================================================

export const InventoryPage: React.FC = () => {
  const [inventories, setInventories] = useState<EnrichedInventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedInventory, setSelectedInventory] = useState<EnrichedInventory | null>(null);
  
  // Reference data
  const [items, setItems] = useState<Map<string, any>>(new Map());
  const [warehouses, setWarehouses] = useState<Map<string, any>>(new Map());
  const [locations, setLocations] = useState<Map<string, any>>(new Map());
  const [lots, setLots] = useState<Map<string, any>>(new Map());
  const [serials, setSerials] = useState<Map<string, any>>(new Map());
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (items.size > 0) {
      fetchInventories();
    }
  }, [items]);

  // ============================================================================
  // FETCH REFERENCE DATA
  // ============================================================================

  const fetchReferenceData = async () => {
    try {
      // Fetch all reference data in parallel
      const [itemsData, warehousesData, locationsData, lotsData, serialsData] = await Promise.all([
        productService.getItems(),
        locationService.getWarehouses(),
        locationService.getLocations(),
        inventoryService.getAllLots(),
        inventoryService.getAllSerials(),
      ]);

      // Convert arrays to Maps for quick lookup
      const itemsMap = new Map(
        (Array.isArray(itemsData) ? itemsData : []).map((item: any) => [item.id, item])
      );
      const warehousesMap = new Map(
        (Array.isArray(warehousesData) ? warehousesData : []).map((wh: any) => [wh.id, wh])
      );
      const locationsMap = new Map(
        (Array.isArray(locationsData) ? locationsData : []).map((loc: any) => [loc.id, loc])
      );
      const lotsMap = new Map(
        (Array.isArray(lotsData) ? lotsData : []).map((lot: any) => [lot.id, lot])
      );
      const serialsMap = new Map(
        (Array.isArray(serialsData) ? serialsData : []).map((serial: any) => [serial.id, serial])
      );

      setItems(itemsMap);
      setWarehouses(warehousesMap);
      setLocations(locationsMap);
      setLots(lotsMap);
      setSerials(serialsMap);
    } catch (error) {
      console.error('Error fetching reference data:', error);
      toast.error('Failed to load reference data');
    }
  };

  // ============================================================================
  // FETCH INVENTORIES WITH ENRICHED DATA
  // ============================================================================

  const fetchInventories = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getAllInventories();
      const inventoryArray = Array.isArray(data) ? data : [];
      
      // Enrich inventory data with names
      const enrichedData = inventoryArray.map((inv: Inventory) => {
        const item = items.get(inv.itemId);
        const warehouse = warehouses.get(inv.warehouseId);
        const location = locations.get(inv.locationId);
        const lot = inv.lotId ? lots.get(inv.lotId) : null;
        const serial = inv.serialId ? serials.get(inv.serialId) : null;

        return {
          ...inv,
          itemName: item?.name || 'Unknown Item',
          itemSku: item?.sku || '',
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          locationName: location?.code || 'Unknown Location',
          lotNumber: lot?.lotNumber || '',
          serialNumber: serial?.serialNumber || '',
        } as EnrichedInventory;
      });

      setInventories(enrichedData);
    } catch (error) {
      console.error('Error fetching inventories:', error);
      toast.error('Failed to load inventories');
      setInventories([]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const handleCreate = () => {
    setSelectedInventory(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (inventory: EnrichedInventory) => {
    setSelectedInventory(inventory);
    setIsEditModalOpen(true);
  };

  const handleView = (inventory: EnrichedInventory) => {
    setSelectedInventory(inventory);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (inventory: EnrichedInventory) => {
    setSelectedInventory(inventory);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedInventory) return;

    try {
      await inventoryService.deleteInventory(selectedInventory.id);
      toast.success('Inventory deleted successfully');
      fetchInventories();
      setIsDeleteDialogOpen(false);
      setSelectedInventory(null);
    } catch (error) {
      console.error('Error deleting inventory:', error);
      toast.error('Failed to delete inventory');
    }
  };

  const handleModalSuccess = () => {
    fetchInventories();
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedInventory(null);
  };

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredInventories = inventories.filter((inventory) => {
    const matchesSearch =
      !searchTerm ||
      inventory.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inventory.itemSku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inventory.warehouseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inventory.locationName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || inventory.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  const stats = {
    total: inventories.length,
    available: inventories.filter((i) => i.status === 'AVAILABLE').length,
    reserved: inventories.filter((i) => i.status === 'RESERVED').length,
    damaged: inventories.filter((i) => i.status === 'DAMAGED').length,
  };

  // ============================================================================
  // STATUS BADGE
  // ============================================================================

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      AVAILABLE: { color: 'bg-green-100 text-green-800', label: 'Available' },
      RESERVED: { color: 'bg-yellow-100 text-yellow-800', label: 'Reserved' },
      QUARANTINED: { color: 'bg-purple-100 text-purple-800', label: 'Quarantined' },
      DAMAGED: { color: 'bg-red-100 text-red-800', label: 'Damaged' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage inventory levels</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus size={20} />
          New Inventory
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search by item, SKU, warehouse, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full">
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="QUARANTINED">Quarantined</option>
            <option value="DAMAGED">Damaged</option>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Inventory</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-green-600">{stats.available}</p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Reserved</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.reserved}</p>
            </div>
            <Archive className="text-yellow-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Damaged</p>
              <p className="text-2xl font-bold text-red-600">{stats.damaged}</p>
            </div>
            <AlertTriangle className="text-red-500" size={32} />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    On Hand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reserved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UOM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventories.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      <Package size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No inventory records found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredInventories.map((inventory) => (
                    <tr key={inventory.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{inventory.itemName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{inventory.itemSku || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{inventory.warehouseName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{inventory.locationName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{inventory.quantityOnHand}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-yellow-600">{inventory.quantityReserved}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">{inventory.availableQuantity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{inventory.uom}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(inventory.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleView(inventory)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(inventory)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(inventory)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <InventoryFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleModalSuccess}
          mode="create"
        />
      )}

      {isEditModalOpen && selectedInventory && (
        <InventoryFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleModalSuccess}
          mode="edit"
          inventory={selectedInventory}
        />
      )}

      {isViewModalOpen && selectedInventory && (
        <InventoryViewModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          inventory={selectedInventory}
        />
      )}

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Inventory"
        message="Are you sure you want to delete this inventory record? This action cannot be undone."
      />
    </div>
  );
};

// ============================================================================
// INVENTORY VIEW MODAL COMPONENT
// ============================================================================

interface InventoryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: EnrichedInventory;
}

const InventoryViewModal: React.FC<InventoryViewModalProps> = ({ isOpen, onClose, inventory }) => {
  if (!isOpen) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between py-3 border-b border-gray-200">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm text-gray-900">{value || 'N/A'}</span>
    </div>
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      AVAILABLE: { color: 'bg-green-100 text-green-800', label: 'Available' },
      RESERVED: { color: 'bg-yellow-100 text-yellow-800', label: 'Reserved' },
      QUARANTINED: { color: 'bg-purple-100 text-purple-800', label: 'Quarantined' },
      DAMAGED: { color: 'bg-red-100 text-red-800', label: 'Damaged' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Inventory Details</h2>
            <p className="text-sm text-gray-600 mt-1">Complete inventory record information</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Item Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-blue-600" />
              Item Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <InfoRow label="Item Name" value={inventory.itemName} />
              <InfoRow label="SKU" value={inventory.itemSku} />
              <InfoRow label="Item ID" value={inventory.itemId} />
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <InfoRow label="Warehouse" value={inventory.warehouseName} />
              <InfoRow label="Location" value={inventory.locationName} />
              <InfoRow label="Warehouse ID" value={inventory.warehouseId} />
              <InfoRow label="Location ID" value={inventory.locationId} />
            </div>
          </div>

          {/* Quantity Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <InfoRow
                label="Quantity On Hand"
                value={
                  <span className="font-semibold text-blue-600">
                    {inventory.quantityOnHand} {inventory.uom}
                  </span>
                }
              />
              <InfoRow
                label="Quantity Reserved"
                value={
                  <span className="font-semibold text-yellow-600">
                    {inventory.quantityReserved} {inventory.uom}
                  </span>
                }
              />
              <InfoRow
                label="Quantity Damaged"
                value={
                  <span className="font-semibold text-red-600">
                    {inventory.quantityDamaged} {inventory.uom}
                  </span>
                }
              />
              <InfoRow
                label="Available Quantity"
                value={
                  <span className="font-bold text-green-600 text-lg">
                    {inventory.availableQuantity} {inventory.uom}
                  </span>
                }
              />
              <InfoRow label="Unit of Measure" value={inventory.uom} />
            </div>
          </div>

          {/* Tracking Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracking Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <InfoRow label="Lot Number" value={inventory.lotNumber || 'Not assigned'} />
              <InfoRow label="Serial Number" value={inventory.serialNumber || 'Not assigned'} />
              <InfoRow label="Lot ID" value={inventory.lotId || 'Not assigned'} />
              <InfoRow label="Serial ID" value={inventory.serialId || 'Not assigned'} />
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <InfoRow label="Status" value={getStatusBadge(inventory.status)} />
              <InfoRow
                label="Unit Cost"
                value={inventory.unitCost ? `$${inventory.unitCost.toFixed(2)}` : 'N/A'}
              />
              <InfoRow label="Manufacture Date" value={formatDate(inventory.manufactureDate)} />
              <InfoRow label="Expiry Date" value={formatDate(inventory.expiryDate)} />
              <InfoRow label="Last Count Date" value={formatDate(inventory.lastCountDate)} />
              <InfoRow label="Attributes" value={inventory.attributes || 'None'} />
            </div>
          </div>

          {/* System Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <InfoRow label="Inventory ID" value={inventory.id} />
              <InfoRow label="Created At" value={formatDate(inventory.createdAt)} />
              <InfoRow label="Updated At" value={formatDate(inventory.updatedAt)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// INVENTORY FORM MODAL COMPONENT
// ============================================================================

interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  inventory?: EnrichedInventory | null;
}

const InventoryFormModal: React.FC<InventoryFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  inventory,
}) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    itemId: '',
    warehouseId: '',
    locationId: '',
    lotId: '',
    serialId: '',
    quantityOnHand: 0,
    quantityReserved: 0,
    quantityDamaged: 0,
    uom: '',
    status: 'AVAILABLE',
    unitCost: '',
    expiryDate: '',
    manufactureDate: '',
    attributes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchItems();
      fetchWarehouses();
      fetchLots();
      fetchSerials();

      if (mode === 'edit' && inventory) {
        setFormData({
          itemId: inventory.itemId || '',
          warehouseId: inventory.warehouseId || '',
          locationId: inventory.locationId || '',
          lotId: inventory.lotId || '',
          serialId: inventory.serialId || '',
          quantityOnHand: inventory.quantityOnHand || 0,
          quantityReserved: inventory.quantityReserved || 0,
          quantityDamaged: inventory.quantityDamaged || 0,
          uom: inventory.uom || '',
          status: inventory.status || 'AVAILABLE',
          unitCost: inventory.unitCost?.toString() || '',
          expiryDate: inventory.expiryDate || '',
          manufactureDate: inventory.manufactureDate || '',
          attributes: inventory.attributes || '',
        });

        if (inventory.warehouseId) {
          fetchLocationsByWarehouse(inventory.warehouseId);
        }
      } else {
        setFormData({
          itemId: '',
          warehouseId: '',
          locationId: '',
          lotId: '',
          serialId: '',
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityDamaged: 0,
          uom: '',
          status: 'AVAILABLE',
          unitCost: '',
          expiryDate: '',
          manufactureDate: '',
          attributes: '',
        });
        setLocations([]);
      }
    }
  }, [isOpen, mode, inventory]);

  const fetchItems = async () => {
    try {
      const response = await productService.getItems();
      setItems(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await locationService.getWarehouses();
      setWarehouses(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchLocationsByWarehouse = async (warehouseId: string) => {
    try {
      const response = await locationService.getLocations({ warehouseId });
      setLocations(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchLots = async () => {
    try {
      const response = await inventoryService.getAllLots();
      setLots(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching lots:', error);
    }
  };

  const fetchSerials = async () => {
    try {
      const response = await inventoryService.getAllSerials();
      setSerials(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching serials:', error);
    }
  };

  const handleWarehouseChange = (warehouseId: string) => {
    setFormData({ ...formData, warehouseId, locationId: '' });
    if (warehouseId) {
      fetchLocationsByWarehouse(warehouseId);
    } else {
      setLocations([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
        lotId: formData.lotId || undefined,
        serialId: formData.serialId || undefined,
        expiryDate: formData.expiryDate || undefined,
        manufactureDate: formData.manufactureDate || undefined,
        attributes: formData.attributes || undefined,
      };

      if (mode === 'create') {
        await inventoryService.createInventory(submitData);
        toast.success('Inventory created successfully');
      } else if (inventory) {
        await inventoryService.updateInventory(inventory.id, submitData);
        toast.success('Inventory updated successfully');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving inventory:', error);
      toast.error(error.response?.data?.message || 'Failed to save inventory');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? 'Create New Inventory' : 'Edit Inventory'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.itemId}
                onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                required
              >
                <option value="">Select Item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </Select>
            </div>

            {/* Warehouse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.warehouseId}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                required
                disabled={!formData.warehouseId}
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code}
                  </option>
                ))}
              </Select>
            </div>

            {/* Lot (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lot</label>
              <Select value={formData.lotId} onChange={(e) => setFormData({ ...formData, lotId: e.target.value })}>
                <option value="">No Lot</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.lotNumber}
                  </option>
                ))}
              </Select>
            </div>

            {/* Serial (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Serial</label>
              <Select
                value={formData.serialId}
                onChange={(e) => setFormData({ ...formData, serialId: e.target.value })}
              >
                <option value="">No Serial</option>
                {serials.map((serial) => (
                  <option key={serial.id} value={serial.id}>
                    {serial.serialNumber}
                  </option>
                ))}
              </Select>
            </div>

            {/* Quantity On Hand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity On Hand <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.quantityOnHand}
                onChange={(e) => setFormData({ ...formData, quantityOnHand: parseFloat(e.target.value) || 0 })}
                required
                min="0"
                step="0.01"
              />
            </div>

            {/* Quantity Reserved */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Reserved</label>
              <Input
                type="number"
                value={formData.quantityReserved}
                onChange={(e) => setFormData({ ...formData, quantityReserved: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>

            {/* Quantity Damaged */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Damaged</label>
              <Input
                type="number"
                value={formData.quantityDamaged}
                onChange={(e) => setFormData({ ...formData, quantityDamaged: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>

            {/* UOM */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit of Measure <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                required
                placeholder="e.g., pcs, kg, liters"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="QUARANTINED">Quarantined</option>
                <option value="DAMAGED">Damaged</option>
              </Select>
            </div>

            {/* Unit Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Cost</label>
              <Input
                type="number"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            {/* Manufacture Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manufacture Date</label>
              <Input
                type="date"
                value={formData.manufactureDate}
                onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>

          {/* Attributes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attributes</label>
            <textarea
              value={formData.attributes}
              onChange={(e) => setFormData({ ...formData, attributes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Additional attributes (JSON or text)"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : mode === 'create' ? 'Create Inventory' : 'Update Inventory'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};