import { SalesOrder } from './sales'

export type JobStageStatus =
  | 'Queued'
  | 'Pending'
  | 'Pre_Press'
  | 'Printing'
  | 'In_Production'
  | 'Finishing'
  | 'Quality_Check'
  | 'Ready'
  | 'Ready_For_Pickup'
  | 'Done'
  | 'Completed'
  | 'Cancelled'

export type JobPriority = 'Low' | 'Normal' | 'High' | 'Rush'

export interface JobOrder {
  id: string
  job_number: string
  sales_order_id: string | null
  production_area: string | null
  assigned_worker_id?: string | null
  assigned_operator?: string | null
  branch_id?: string | null
  priority?: JobPriority
  specifications?: string | null
  notes?: string | null
  stage_status: JobStageStatus
  deadline: string | null
  artwork_url: string | null
  created_at: string
  sales_orders?: SalesOrder | null
}

export interface JobOrderFormData {
  job_number: string
  sales_order_id: string
  production_area: string
  assigned_operator: string
  branch_id: string
  priority: JobPriority
  specifications: string
  notes: string
  stage_status: JobStageStatus
  deadline: string
  artwork_url: string
}
