import { useState, useEffect } from 'react'
import { Eye, MapPin, Clock, DollarSign } from 'lucide-react'
import Table from '../components/UI/Table'
import Modal from '../components/UI/Modal'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Rides() {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRide, setSelectedRide] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchRides()
  }, [])

  const fetchRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          customer:profiles!rides_customer_id_fkey(full_name, phone),
          driver:profiles!rides_driver_id_fkey(full_name, phone)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRides(data || [])
    } catch (error) {
      console.error('Error fetching rides:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      searching: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-success-100 text-success-800',
      cancelled: 'bg-error-100 text-error-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status) => {
    const texts = {
      pending: 'En attente',
      searching: 'Recherche',
      accepted: 'Acceptée',
      in_progress: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée',
    }
    return texts[status] || status
  }

  const columns = [
    {
      key: 'id',
      title: 'ID Course',
      render: (value) => (
        <span className="font-mono text-xs text-gray-600">
          {value.substring(0, 8)}...
        </span>
      )
    },
    {
      key: 'customer',
      title: 'Client',
      render: (value) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {value?.full_name || 'N/A'}
          </div>
          <div className="text-sm text-gray-500">{value?.phone}</div>
        </div>
      )
    },
    {
      key: 'driver',
      title: 'Chauffeur',
      render: (value) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {value?.full_name || 'Non assigné'}
          </div>
          <div className="text-sm text-gray-500">{value?.phone}</div>
        </div>
      )
    },
    {
      key: 'pickup_address',
      title: 'Départ',
      render: (value) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    {
      key: 'destination_address',
      title: 'Destination',
      render: (value) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Statut',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value)}`}>
          {getStatusText(value)}
        </span>
      )
    },
    {
      key: 'fare_amount',
      title: 'Montant',
      render: (value) => (
        <span className="font-medium">
          {value ? `${value.toLocaleString()} GNF` : 'N/A'}
        </span>
      )
    },
    {
      key: 'created_at',
      title: 'Date',
      render: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: fr })
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => {
            setSelectedRide(row)
            setShowModal(true)
          }}
          className="text-primary-600 hover:text-primary-900"
        >
          <Eye className="h-4 w-4" />
        </button>
      )
    }
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gérez toutes les courses de votre plateforme
            </p>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={rides}
        loading={loading}
      />

      {/* Ride Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Détails de la course"
        size="xl"
      >
        {selectedRide && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Course #{selectedRide.id.substring(0, 8)}
                </h3>
                <p className="text-sm text-gray-500">
                  {format(new Date(selectedRide.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedRide.status)}`}>
                {getStatusText(selectedRide.status)}
              </span>
            </div>

            {/* Participants */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Client</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-900">{selectedRide.customer?.full_name || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{selectedRide.customer?.phone}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Chauffeur</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-900">{selectedRide.driver?.full_name || 'Non assigné'}</p>
                  <p className="text-sm text-gray-500">{selectedRide.driver?.phone}</p>
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Itinéraire</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-3 h-3 bg-success-500 rounded-full mt-1"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Départ</p>
                    <p className="text-sm text-gray-500">{selectedRide.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-3 h-3 bg-error-500 rounded-full mt-1"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Destination</p>
                    <p className="text-sm text-gray-500">{selectedRide.destination_address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Montant</p>
                <p className="text-lg font-semibold text-primary-600">
                  {selectedRide.fare_amount ? `${selectedRide.fare_amount.toLocaleString()} GNF` : 'N/A'}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <MapPin className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Distance</p>
                <p className="text-lg font-semibold text-primary-600">
                  {selectedRide.distance_km ? `${selectedRide.distance_km} km` : 'N/A'}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Clock className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Durée estimée</p>
                <p className="text-lg font-semibold text-primary-600">
                  {selectedRide.estimated_duration_minutes ? `${selectedRide.estimated_duration_minutes} min` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Timeline */}
            {(selectedRide.accepted_at || selectedRide.started_at || selectedRide.completed_at || selectedRide.cancelled_at) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Chronologie</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Course créée</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(selectedRide.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  {selectedRide.accepted_at && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Course acceptée</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(selectedRide.accepted_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedRide.started_at && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Course démarrée</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(selectedRide.started_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedRide.completed_at && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Course terminée</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(selectedRide.completed_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedRide.cancelled_at && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-error-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Course annulée</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(selectedRide.cancelled_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedRide.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {selectedRide.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}