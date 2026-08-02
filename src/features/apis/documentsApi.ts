import { apiSlice } from './apiSlice';

// Types
export interface TemplateMeta {
  headers: number;
  footers: number;
  tables: number;
  images: number;
  placeholders: string[];
  unknownPlaceholders: string[];
  warnings: string[];
}

export interface DocumentTemplate {
  template_id: string;
  name: string;
  description: string | null;
  category: string;
  is_default: boolean;
  is_active: boolean;
  current_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersion {
  version_id: string;
  template_id: string;
  version_number: number;
  file_path: string;
  file_size: number | null;
  metadata: TemplateMeta | null;
  changelog: string | null;
  created_by: string;
  created_at: string;
}

export interface TemplateDetail extends DocumentTemplate {
  versions: TemplateVersion[];
}

export interface OrganizationAsset {
  asset_id: string;
  name: string;
  asset_type: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  vision: string | null;
  mission: string | null;
  core_values: string | null;
  stamp_url: string | null;
  seal_url: string | null;
  watermark_url: string | null;
}

export interface PlaceholderDefinition {
  name: string;
  category: string;
  description: string;
  sample: string;
  isLoop?: boolean;
}

export interface GeneratedDocument {
  document_id: string;
  meeting_id: string;
  template_id: string | null;
  version_used: number | null;
  file_path: string;
  format: string;
  document_number: string | null;
  generated_by: string;
  generated_at: string;
}

export const documentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTemplates: builder.query<{ success: boolean; data: DocumentTemplate[] }, void>({
      query: () => '/documents/templates',
      providesTags: ['Template'],
    }),
    getTemplate: builder.query<{ success: boolean; data: TemplateDetail }, string>({
      query: (id) => `/documents/templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Template', id }],
    }),
    uploadTemplate: builder.mutation<{ success: boolean; data: any }, FormData>({
      query: (formData) => ({
        url: '/documents/templates',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Template'],
    }),
    updateTemplate: builder.mutation<any, { id: string; data: Partial<DocumentTemplate> }>({
      query: ({ id, data }) => ({
        url: `/documents/templates/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Template', id }, 'Template'],
    }),
    deleteTemplate: builder.mutation<any, string>({
      query: (id) => ({
        url: `/documents/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Template'],
    }),
    uploadTemplateVersion: builder.mutation<any, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/documents/templates/${id}/versions`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Template', id }, 'Template'],
    }),
    downloadTemplate: builder.query<{ success: boolean; data: { url: string } }, string>({
      query: (id) => `/documents/templates/${id}/download`,
    }),
    setDefaultTemplate: builder.mutation<any, string>({
      query: (id) => ({
        url: `/documents/templates/${id}/set-default`,
        method: 'POST',
      }),
      invalidatesTags: ['Template'],
    }),
    getPlaceholders: builder.query<{ success: boolean; data: PlaceholderDefinition[] }, void>({
      query: () => '/documents/placeholders',
    }),
    getAssets: builder.query<{ success: boolean; data: OrganizationAsset[] }, void>({
      query: () => '/documents/assets',
      providesTags: ['Asset'],
    }),
    uploadAsset: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: '/documents/assets',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Asset'],
    }),
    deleteAsset: builder.mutation<any, string>({
      query: (id) => ({
        url: `/documents/assets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Asset'],
    }),
    getOrganizationProfile: builder.query<{ success: boolean; data: OrganizationProfile }, void>({
      query: () => '/documents/organization',
      providesTags: ['Asset'],
    }),
    updateOrganizationProfile: builder.mutation<any, Partial<OrganizationProfile>>({
      query: (data) => ({
        url: '/documents/organization',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Asset'],
    }),
    renderDocument: builder.mutation<{ success: boolean; data: { downloadUrl: string; format: string } }, { meetingId: string; data: { template_id: string; format: string; version?: number; document_number?: string } }>({
      query: ({ meetingId, data }) => ({
        url: `/documents/render/${meetingId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['GeneratedDoc'],
    }),
    getGeneratedDocuments: builder.query<{ success: boolean; data: GeneratedDocument[] }, string>({
      query: (meetingId) => `/documents/generated?meeting_id=${meetingId}`,
      providesTags: ['GeneratedDoc'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useUploadTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useUploadTemplateVersionMutation,
  useLazyDownloadTemplateQuery,
  useSetDefaultTemplateMutation,
  useGetPlaceholdersQuery,
  useGetAssetsQuery,
  useUploadAssetMutation,
  useDeleteAssetMutation,
  useGetOrganizationProfileQuery,
  useUpdateOrganizationProfileMutation,
  useRenderDocumentMutation,
  useGetGeneratedDocumentsQuery,
} = documentsApi;
