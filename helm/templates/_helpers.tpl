{{- define "business-web.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "business-web.labels" -}}
app.kubernetes.io/name: {{ include "business-web.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/part-of: meridian-business
meridian.bank/team: business-digital
{{- end -}}
