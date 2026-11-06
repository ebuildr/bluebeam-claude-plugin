# Bluebeam Studio API endpoint reference

Generated from the OpenAPI 3.0.1 spec embedded in developers.bluebeam.com (title "Bluebeam Studio API" v1.0.0). Base URL is region specific (US https://api.bluebeam.com). Every request needs `Authorization: Bearer <access_token>` AND `client_id: <your client id>` headers. JSON bodies need `Content-Type: application/json`.

Legend: `*` = required. Path params are in `{braces}`. Query params listed as `?name`.

## Authentication

### GET /oauth2/authorize
Get an Auth Code
Query: ?response_type*:string, ?client_id*:string, ?state*:string, ?scope*:string, ?redirect_uri*:string
Response 200: code*:string

### POST /oauth2/token
Get Authentication Token
Body (application/x-www-form-urlencoded): client_id*:string, client_secret*:string, code:string, code_verifier:string, grant_type*:string(authorization_code|refresh_token), redirect_uri:string, refresh_token:string
Response 200: object

## Healthcheck

### GET /publicapi/v1/healthcheck
Healthcheck
Response 200: object

## JobResults

### GET /publicapi/v1/jobs/{id}/results
Get a list of all job results metadata.
Query: ?offset:integer, ?limit:integer
Response 200: JobResults:array<Content:string, Id:integer, JobId:integer, Type:string>

### GET /publicapi/v1/jobs/{id}/results/{resultId}
Get a single job result metadata.
Response 200: Content:string, Id:integer, JobId:integer, Type:string

## Jobs

### GET /publicapi/v1/jobs
Get a list of jobs.
Query: ?offset:integer, ?limit:integer, ?descending:integer, ?status:integer
Response 200: Jobs:array<Id:integer, Priority:integer, ResultItemCount:integer, Status:integer, StatusMessage:string>

### GET /publicapi/v1/jobs/{id}
Get a single job metadata.
Response 200: Id:integer, Priority:integer, ResultItemCount:integer, Status:integer, StatusMessage:string

### PUT /publicapi/v1/jobs/{id}/cancel
Cancel a job.
Response 204: No Content

## ProjectFileJobs

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/balancepages
Inserts blank pages into the Pdf file to balance the total number of pages to an odd, even, specific count, or specific page division.
Body (application/json): CurrentPassword:string, Options:{Height:string, PageStyle:string, Type:string, Width:string}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/combine
Combines the Pdf file with a list of other Pdf files.
Body (application/json): Options:{FileIDs:array}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/createpdfareport
Generate a text report on whether the PDF file is PDF/A-1b compliant. Results will always be appended to the output report file.
Body (application/json): CurrentPassword:string, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/deletepages
Deletes pages from a Pdf file.
Body (application/json): CurrentPassword:string, Options:{PageRange:string}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/dwg2pdf
Converts a DWG file to Pdf.
Body (application/json): Options:{ApplyLineMerge:boolean, AsciiHexEncoding:boolean, EmbedOptimizedTTF:boolean, EmbededTTF:boolean, ExportHyperlinks:boolean, FontsLocation:string, ImageDPI:integer, IncludeLayers:boolean, IncludeLayoutType:string, IncludeOffLayers:boolean, LineMergeBlendMode:string, LineMergeFillOpacity:number, LineMergeStrokeOpacity:number, PlotStyleSheet:string, PlotStyleSheetLocation:string, RespectWipeouts:boolean, SHXTextAsGeometry:boolean, TTFTextAsGeometry:boolean, ZoomToExtentsMode:boolean}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/excel2pdf
Converts an Excel file to Pdf.
Body (application/json): Options:{ImageDPI:integer, Margin:object, PageCount:integer, PageOrientation:string, StartPage:integer, TransferBookmarks:string, TransferHyperlinks:boolean}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/exportcustomcolumns
Exports the Custom Column definition of the Pdf file to an .xml file.
Body (application/json): CurrentPassword:string, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/exportformdata
Exports the form data from the Pdf file to a .xml, .csv, or .fdf file.
Body (application/json): CurrentPassword:string, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/exportmarkups
Exports the Pdf file markups to an output file.
Body (application/json): CurrentPassword:string, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/extractpages
Extracts pages from the Pdf file.
Body (application/json): CurrentPassword:string, Options:{PageRange:string}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/fileproperties
Creates a job that will return the Pdf file properties.
Body (application/json): CurrentPassword:string, Priority:integer
Response 200: Id:integer

### GET /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/fileproperties/{jobId}
Retrieves the file properties list generated by the 'fileproperties' job.
Response 200: FileProperties:array<string>, JobStatus:integer, JobStatusMessage:string

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/fileproperty
Sets the value for the specified property in the Pdf file.
Body (application/json): CurrentPassword:string, Name:string, Priority:integer, Value:string
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/filepropertyvalue
Creates a job that will return the value of a specified file property.
Body (application/json): CurrentPassword:string, Name:string, Priority:integer
Response 200: Id:integer

### GET /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/filepropertyvalue/{jobId}
Retrieves the value generated by the 'filepropertyvalue' job.
Response 200: JobStatus:integer, JobStatusMessage:string, Value:string

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/flatten
Flattens the annotation to be part of the page content, for a given Pdf file.
Body (application/json): CurrentPassword:string, LayerName:string, Options:{Ellipse:boolean, FileAttachment:boolean, Flags:boolean, FormFields:boolean, Group:boolean, Image:boolean, InkAndHighlighter:boolean, LineAndDimension:boolean, MeasureArea:boolean, Notes:boolean, PolygonAndCloud:boolean, Polyline:boolean, Rectangle:boolean, Snapshot:boolean, Stamp:boolean, TextAndCallout:boolean, TextMarkups:boolean}, OutputFileName:string, OutputPath:string, PageRange:string, Priority:integer, Recoverable:boolean
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/headerandfooter
Applies headers and footers to the Pdf file.
Body (application/json): CurrentPassword:string, FitToContent:boolean, Font:{Bold:boolean, Italic:boolean, Size:number, TextColor:string, Type:string, Underline:boolean}, Footer:{CenterText:string, LeftText:string, RightText:string}, Header:{CenterText:string, LeftText:string, RightText:string}, Margin:{Bottom:number, Left:number, Right:number, Top:number}, OutputFileName:string, OutputPath:string, PageRange:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/image2pdf
Converts an Image file to Pdf.
Body (application/json): OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/importcustomcolumns
Imports a Custom Column definition .xml file into the Pdf file , overwriting any existing Custom Columns. An .xml file can be generated by either the method 'exportcustomcolumns', or from within Bluebeam Revu.
Body (application/json): CurrentPassword:string, CustomColumnsFileID:integer, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/importmarkups
Imports the markups from a list of files into the input Pdf file.
Body (application/json): CurrentPassword:string, Options:{FileIDs:array}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/insertblankpages
Inserts new blank pages into the Pdf file using the specified parameters for width, height, count and style.
Body (application/json): CurrentPassword:string, Options:{Height:number, PageCount:integer, PageIndex:integer, PageStyle:string, Width:number}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/insertpages
Inserts a Pdf file into the active Pdf file using the specified parameters to control what additional data to be additionally imported such as bookmarks, file attachments, and file properties.
Body (application/json): CurrentPassword:string, Options:{InsertAttachments:boolean, InsertBookmarks:boolean, InsertLayers:boolean, InsertProperties:boolean, PageIndex:integer, UseFileNameAsLabel:boolean}, OutputFileName:string, OutputPath:string, Priority:integer, SourceFileId:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/markuplist
Creates a job that will generate the list of the markups from the Pdf file.
Body (application/json): CurrentPassword:string, PageRange:string, Priority:integer
Response 200: Id:integer

### GET /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/markuplist/{jobId}
Retrieves the markup list generated by the 'markuplist' job.
Response 200: JobStatus:integer, JobStatusMessage:string, Markups:array<Author:string, Checked:boolean, Color:string, ColorFill:string, ColorText:string, Comment:string, DateCreated:string, DateModified:string, ExtendedProperties:object, Grouped:boolean, Height:number, Id:string, Layer:string, LineStyle:string, LineWidth:number, Locked:boolean, Opacity:number, OpacityFill:number, Page:integer, Parent:string, Rotation:number, Space:string, Status:string, Subject:string, Type:string, Width:number, X:number, Y:number>

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/openpassword
Sets open password for the Pdf file.
Body (application/json): CurrentPassword:string, OutputFileName:string, OutputPath:string, Password:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/pagecount
Creates a job that will return the number of pages in the Pdf file.
Body (application/json): CurrentPassword:string, Priority:integer
Response 200: Id:integer

### GET /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/pagecount/{jobId}
Retrieves the 'PageCount' value generated by the 'pagecount' job.
Response 200: JobStatus:integer, JobStatusMessage:string, PageCount:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/pagerotation
Creates a job that will return the page rotation of a specified page in the Pdf file.
Body (application/json): CurrentPassword:string, PageIndex:integer, Priority:integer
Response 200: Id:integer

### GET /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/pagerotation/{jobId}
Retrieves the 'PageRotation' value generated by the 'pagerotation' job.
Response 200: JobStatus:integer, JobStatusMessage:string, PageRotation:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/pagesize
Creates a job that will return the page size of a specified page in the Pdf file.
Body (application/json): CurrentPassword:string, PageIndex:integer, Priority:integer
Response 200: Id:integer

### GET /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/pagesize/{jobId}
Retrieves the 'PageSize' value generated by the 'pagesize' job.
Response 200: Height:number, JobStatus:integer, JobStatusMessage:string, Width:number

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/pdfsecurity
Applies security permissions to the Pdf file.
Body (application/json): CurrentPassword:string, Options:{AllowAccessibility:boolean, AllowCopyContent:boolean, AllowEditDocument:boolean, AllowEditMarkups:boolean, AllowFillForms:boolean, AllowPageManipulation:boolean, AllowPrint:boolean, AllowPrintLowOnly:boolean, MasterPassword:string, OpenPassword:string}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/processcolors
Converts page content colors to a color or gray scale.
Body (application/json): CurrentPassword:string, Options:{InputColor:string, OutputColor:string, PageRange:string, ProcessImages:boolean, Scale:boolean}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/ps2pdf
Converts a PostScript file to Pdf.
Body (application/json): Options:{BlendAlpha:integer, BlendMode:string, ImageCompression:string, ImageResolution:integer, JpegQuality:integer, LineMergeOn:boolean, PageSize:object, Rotation:string}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/reducefilesize
Reduces the file size of the Pdf file.
Body (application/json): CurrentPassword:string, Options:{CompressAllStreams:boolean, DropFonts:boolean, DropMiscellaneous:boolean, ImageDPI:integer, ReduceImageLevel:string}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/repair
Runs a repair process on the Pdf file using the specified options.
Body (application/json): CurrentPassword:string, Options:{CombineStripedImages:boolean, FixStripedImages:boolean, OptimizeSolidColorImages:boolean, ProcessMasks:boolean, RemoveTextClipping:boolean, SimplifyClippingPaths:boolean}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/replacepages
Replaces pages in the current Pdf file with pages from the source Pdf file.
Body (application/json): CurrentPassword:string, Options:{ContentOnly:boolean, PagesToInsert:string, PagesToReplace:string}, OutputFileName:string, OutputPath:string, Priority:integer, SourceFileId:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/reversepages
Reverses all pages in the Pdf file.
Body (application/json): CurrentPassword:string, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/rotatepage
Rotates the pages from a Pdf file by 90 degree increments.
Body (application/json): CurrentPassword:string, Options:{IncludeLandscapePages:boolean, IncludePortraitPages:boolean, PageRange:string, RotationAngle:integer}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/saveaspdfa
Converts the current PDF document into a PDF/A-1b document.
Body (application/json): CurrentPassword:string, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/splitpages
Extracts all pages inside the Pdf file to individual Pdf files.
Body (application/json): CurrentPassword:string, Options:{CustomPageLabel:string, UsePageLabels:boolean}, OutputPath:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/stamp
Stamps a Pdf file.
Body (application/json): CurrentPassword:string, Options:{BlendMode:string, Locked:boolean, Opacity:number, Origin:string, PageRange:string, Rotation:number, Scale:number, XOffset:number, YOffset:number}, OutputFileName:string, OutputPath:string, Priority:integer, StampFileId:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/unflatten
Reverses the flattening process on a Pdf file.
Body (application/json): CurrentPassword:string, OutputFileName:string, OutputPath:string, PageRange:string, Priority:integer
Response 200: Id:integer

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/word2pdf
Converts a Word file to Pdf.
Body (application/json): Options:{CustomPage:object, ImageDPI:integer, Margin:object, PageCount:integer, PageOrientation:string, StartPage:integer, TransferBookmarks:string, TransferHyperlinks:boolean}, OutputFileName:string, OutputPath:string, Priority:integer
Response 200: Id:integer

## ProjectFileRevisions

### GET /publicapi/v1/projects/{projectId}/files/{fileId}/revisions
Get all file revisions
Response 200: ProjectFileRevisions:array<CRC:string, Comment:string, Id:integer, OperationType:string, RevisionNumber:integer, RevisionRestorable:boolean, Size:integer, Timestamp:string, UserEmail:string, UserName:string>

### GET /publicapi/v1/projects/{projectId}/files/{fileId}/revisions/{id}
Get a file revision metadata. Includes DownloadUrl which can be used to download file content. For DownloadUrl of most recent revision use Get /v1/projects/{PublicId}/files/{id}
Response 200: CRC:string, Comment:string, DownloadUrl:string, Id:integer, OperationType:string, RevisionNumber:integer, RevisionRestorable:boolean, Size:integer, Timestamp:string, UserEmail:string, UserName:string

### POST /publicapi/v1/projects/{projectId}/files/{fileId}/revisions/{id}/restore
Restore file revision
Response 204: Success

## ProjectFiles

### GET /publicapi/v1/projects/{projectId}/files
Get all files in a project
Query: ?offset:integer, ?limit:integer
Response 200: ProjectFiles:array<CRC:string, Created:string, Id:integer, InSession:boolean, IsLocked:boolean, LockOwnerEmail:string, LockOwnerName:string, Name:string, ParentFolderId:integer, Path:string, Permission:string, RevisionID:integer, SessionId:string, SessionName:string, Size:integer>, TotalCount:integer

### POST /publicapi/v1/projects/{projectId}/files
Create metadata for a new project file. PUT actual file to UploadUrl returned in a create response POST confirm-upload at the end of file upload to make it available in a project.
Body (application/json): CRC:string, Name*:string, ParentFolderId:integer, Size:integer
Response 200: Id:integer, UploadContentType:string, UploadUrl:string

### GET /publicapi/v1/projects/{projectId}/files/by-path
Get file metadata by path. Includes DownloadUrl which can be used to download file content.
Query: ?path*:string
Response 200: CRC:string, Created:string, DownloadUrl:string, Id:integer, InSession:boolean, IsLocked:boolean, LockOwnerEmail:string, LockOwnerName:string, Name:string, ParentFolderId:integer, Path:string, Permission:string, RevisionID:integer, SessionId:string, SessionName:string, Size:integer

### DELETE /publicapi/v1/projects/{projectId}/files/{id}
Delete a project file
Response 204: Success

### GET /publicapi/v1/projects/{projectId}/files/{id}
Get file metadata. Includes DownloadUrl which can be used to download file content.
Response 200: CRC:string, Created:string, DownloadUrl:string, Id:integer, InSession:boolean, IsLocked:boolean, LockOwnerEmail:string, LockOwnerName:string, Name:string, ParentFolderId:integer, Path:string, Permission:string, RevisionID:integer, SessionId:string, SessionName:string, Size:integer

### PUT /publicapi/v1/projects/{projectId}/files/{id}
Update project file. To move the file, change its parent folder id.
Body (application/json): Name:string, ParentFolderId:integer
Response 204: Success

### POST /publicapi/v1/projects/{projectId}/files/{id}/checkin
Checkin project file. PUT actual file to UploadUrl returned in a create response POST confirm-checkin at the end of file upload to make it available in a project.
Response 200: UploadContentType:string, UploadUrl:string

### DELETE /publicapi/v1/projects/{projectId}/files/{id}/checkout
Revoke file checkout. This will put the file in a conflicted state in Revu if there are local changes.
Response 204: Success

### POST /publicapi/v1/projects/{projectId}/files/{id}/checkout
Checkout file for modification
Response 204: Success

### POST /publicapi/v1/projects/{projectId}/files/{id}/checkout-to-session
Checkout project file to Studio Session. This operation will link project to a Session
Body (application/json): SessionId*:string
Response 204: Id:integer, SessionId:string

### POST /publicapi/v1/projects/{projectId}/files/{id}/confirm-checkin
Confirm checkin of project file
Body (application/json): CRC:string, Comment:string, Size:integer
Response 204: Success

### POST /publicapi/v1/projects/{projectId}/files/{id}/confirm-upload
Confirm Project file upload and make it available in a Session. Should be called after uploading project file.
Response 204: Success

### POST /publicapi/v1/projects/{projectId}/files/{id}/copy
Copy a file
Body (application/json): Name:string, ParentFolderId:integer
Response 200: Id:integer

## ProjectFolderPermissions

### GET /publicapi/v1/projects/{projectId}/folders/{folderId}/permissions
Get project folder permission. Will return empty string if permission is not set
Query: ?userId:integer
Response 200: FolderId:integer, Permission:string, ProjectId:string

### PUT /publicapi/v1/projects/{projectId}/folders/{folderId}/permissions
Update project folder permissions. Permission types: Hidden, Read, ReadWrite, ReadWriteDelete. Set Permission to null to inherit permission from parent folder.
Body (application/json): Permission:string, UserId:integer
Response 204: Success

## ProjectFolders

### GET /publicapi/v1/projects/{projectId}/folders
Get all files in a project
Query: ?offset:integer, ?limit:integer
Response 200: ProjectFolders:array<Created:string, Id:integer, Name:string, ParentFolderId:integer, Path:string, Permission:string>, TotalCount:integer

### POST /publicapi/v1/projects/{projectId}/folders
Create a new empty project folder
Body (application/json): Comment:string, Name*:string, ParentFolderId:integer
Response 200: Id:integer

### DELETE /publicapi/v1/projects/{projectId}/folders/{id}
Delete a project folder
Response 204: Success

### GET /publicapi/v1/projects/{projectId}/folders/{id}
Get project folder metadata. Use 0 to get the project's root folder
Response 200: Created:string, Id:integer, IdPath:string, Name:string, ParentFolderId:integer, Path:string, Permission:string

### PUT /publicapi/v1/projects/{projectId}/folders/{id}
Update project folder. To move the folder, change its parent folder id.
Body (application/json): Name:string, ParentFolderId:integer
Response 204: Success

### GET /publicapi/v1/projects/{projectId}/folders/{id}/items
Get files and/or folders contained within specified folder. Use 0 to get the project's root folder items
Query: ?offset:integer, ?limit:integer
Response 200: ProjectFiles:array<CRC:string, Created:string, Id:integer, InSession:boolean, IsLocked:boolean, LockOwnerEmail:string, LockOwnerName:string, Name:string, ParentFolderId:integer, Path:string, Permission:string, RevisionID:integer, SessionId:string, SessionName:string, Size:integer>, ProjectFolders:array<Created:string, Id:integer, Name:string, ParentFolderId:integer, Path:string, Permission:string>, TotalCount:integer

## ProjectPermissions

### GET /publicapi/v1/projects/{projectId}/permissions
Get project permissions
Response 200: ProjectPermissions:array<Allow*:string, Type*:string>

### PUT /publicapi/v1/projects/{projectId}/permissions
Update project permissions. Set value to allow, deny, or default
Body (application/json): Allow*:string, Type*:string
Response 204: Success

## ProjectSharedLinks

### GET /publicapi/v1/projects/{projectId}/sharedlinks
Get all shared links in a project
Query: ?offset:integer, ?limit:integer
Response 200: SharedLinks:array<ClickCount:integer, Created:string, DownloadCount:integer, Enabled:boolean, Expired:boolean, Expires:string, Filename:string, FlattenPending:boolean, Flattened:boolean, Hidden:boolean, Id:integer, LastClicked:string, LastDownloaded:string, PasswordProtected:boolean, ProjectItemId:integer, PublicProjectId:string, ShareLink:string, SharingUserId:integer, SharingUserName:string>, TotalCount:integer

### POST /publicapi/v1/projects/{projectId}/sharedlinks
Create a shared link for a project file
Body (application/json): Expires:string, Flatten:boolean, Password:string, PasswordProtected:boolean, ProjectFileId*:integer
Response 200: Id:integer, ShareLink:string

### DELETE /publicapi/v1/projects/{projectId}/sharedlinks/{id}
Delete shared link
Response 204: Success

### GET /publicapi/v1/projects/{projectId}/sharedlinks/{id}
Get shared link metadata
Response 200: ClickCount:integer, Created:string, DownloadCount:integer, Enabled:boolean, Expired:boolean, Expires:string, Filename:string, FlattenPending:boolean, Flattened:boolean, Hidden:boolean, Id:integer, LastClicked:string, LastDownloaded:string, PasswordProtected:boolean, ProjectItemId:integer, PublicProjectId:string, ShareLink:string, SharingUserId:integer, SharingUserName:string

### PUT /publicapi/v1/projects/{projectId}/sharedlinks/{id}
Update shared link. Can be used to disable or hide shared link
Body (application/json): Enabled:boolean, Hidden:boolean
Response 204: Success

## ProjectUserPermissions

### GET /publicapi/v1/projects/{projectId}/users/{userId}/permissions
Get project user permissions
Response 200: ProjectPermissions:array<Allow*:string, Type*:string>

### PUT /publicapi/v1/projects/{projectId}/users/{userId}/permissions
Update project user permissions. Permission types: CreateSessions, UndoCheckouts, Invite, ManageParticipants, ManagePermissions, FullControl, ShareItems. Set value to allow, deny, or default
Body (application/json): Allow*:string, Type*:string
Response 204: Success

## ProjectUsers

### POST /publicapi/v1/projects/{projectId}/invite
Invite user to project by email
Body (application/json): Email:string
Response 204: Success

### GET /publicapi/v1/projects/{projectId}/users
Get all users in a project
Query: ?offset:integer, ?limit:integer, ?showPendingInvite:boolean
Response 200: ProjectUsers:array<Email:string, Id:integer, IsProjectOwner:boolean, Name:string, RestrictedStatus:string>, TotalCount:integer

### POST /publicapi/v1/projects/{projectId}/users
Add user to a project
Body (application/json): Email*:string, SendEmail:boolean
Response 204: Success

### DELETE /publicapi/v1/projects/{projectId}/users/{id}
Remove user from project
Response 204: Success

### GET /publicapi/v1/projects/{projectId}/users/{id}
Get a single user in a project
Response 200: Email:string, Id:integer, IsProjectOwner:boolean, Name:string, RestrictedStatus:string

### PUT /publicapi/v1/projects/{projectId}/users/{id}
Update user in a project
Body (application/json): RestrictedStatus:string
Response 204: Success

## Projects

### GET /publicapi/v1/projects
Get all projects
Query: ?orderby:string, ?offset:integer, ?limit:integer, ?ownedOrAttending:string, ?searchTerm:string
Response 200: Projects:array<Created:string, Guid:string, Id:string, InviteUrl:string, Name:string, OwnerEmail:string, OwnerNameIdentifier:string, PrimeId:integer, Restricted:boolean>, TotalCount:integer

### POST /publicapi/v1/projects
Create a project.
Body (application/json): Name*:string, Notification:boolean, Restricted:boolean
Response 200: Id:string

### DELETE /publicapi/v1/projects/{id}
Delete a project
Response 204: Success

### GET /publicapi/v1/projects/{id}
Get a single project
Response 200: Created:string, Guid:string, Id:string, InviteUrl:string, Name:string, OwnerEmail:string, OwnerNameIdentifier:string, PrimeId:integer, Restricted:boolean

### PUT /publicapi/v1/projects/{id}
Update a project
Body (application/json): Name:string, Notification:boolean, OwnerEmailOrId:string, Restricted:boolean
Response 204: Created:string, Guid:string, Id:string, InviteUrl:string, Name:string, OwnerEmail:string, OwnerNameIdentifier:string, PrimeId:integer, Restricted:boolean

## SessionActivity

### GET /publicapi/v1/sessions/{sessionId}/activities
Get all Studio Session activities.
Query: ?offset:integer, ?limit:integer, ?reverse:boolean, ?afterId:integer
Response 200: SessionActivities:array<Created:string, DocumentId:integer, Id:integer, Message:string, UserId:integer>, TotalCount:integer

### POST /publicapi/v1/sessions/{sessionId}/activities
Create a Studio Session activity
Body (application/json): Message*:string
Response 204: Id:integer

### GET /publicapi/v1/sessions/{sessionId}/activities/{id}
Get a Studio Session activity
Response 200: Created:string, DocumentId:integer, Id:integer, Message:string, UserId:integer

## SessionFiles

### GET /publicapi/v1/sessions/{sessionId}/files
Get all files in a Studio Session
Query: ?offset:integer, ?limit:integer, ?includeDeleted:boolean
Response 200: Files:array<CRC:string, Created:string, Id:integer, Name:string, Size:integer, Source:string, Status:string>, TotalCount:integer

### POST /publicapi/v1/sessions/{sessionId}/files
Create metadata for a new Studio Session file.
Body (application/json): CRC:string, Name*:string, Size:integer, Source*:string
Response 200: Id:integer, UploadContentType:string, UploadUrl:string

### DELETE /publicapi/v1/sessions/{sessionId}/files/{id}
Delete a Studio Session file
Response 204: Success

### GET /publicapi/v1/sessions/{sessionId}/files/{id}
Get Studio Session file metadata.
Query: ?includeFinalized:boolean
Response 200: CRC:string, Created:string, DownloadUrl:string, Id:integer, Name:string, Size:integer, SnapshotCreated:string, SnapshotDownloadUrl:string, SnapshotModified:string, Source:string, Status:string

### POST /publicapi/v1/sessions/{sessionId}/files/{id}/checkin
Update Studio Project copy
Body (application/json): Comment:string
Response 204: Success

### POST /publicapi/v1/sessions/{sessionId}/files/{id}/confirm-upload
Confirm Studio Session file upload
Response 204: Success

### GET /publicapi/v1/sessions/{sessionId}/files/{id}/snapshot
Get metadata on Studio Session document snapshot job.
Response 200: DownloadUrl:string, LastSnapshotTime:string, Status:string, StatusTime:string

### POST /publicapi/v1/sessions/{sessionId}/files/{id}/snapshot
Start Studio Session document snapshot job.
Response 204: Success

## SessionMarkups

### GET /publicapi/v2/sessions/{sessionId}/files/{fileId}/markups
Returns a list of markups on the Session document.
Response 200: [ comments:string, conversionFactor:number, created:string, displayName:string, documentHeight:number, documentId:integer, documentWidth:number, email:string, label:string, layer:string, length:string, lock:boolean, markupId:integer, modified:string, name:string, pageNumber:integer, parentName:string, precision:integer, scaleRatio:string, sessionId:string, status:string, subject:string, type:string, unit:string, x:number, y:number ]

### GET /publicapi/v2/sessions/{sessionId}/files/{fileId}/markups/details
Returns a detailed list of markups on the Session document.
Query: ?offset:integer, ?limit:integer
Response 200: [ alignOnSegment:boolean, alignment:integer, angle1:number, angle2:number, ap:string, arrowBegin:string, arrowBeginScale:number, arrowEnd:string, arrowEndScale:number, attachIcon:string, attachments:array<string>, author:string, autosize:boolean, blendMode:string, borderEffectIntensity:number, borderEffectInvert:boolean, borderEffectStyle:string, callout:array<number>, calloutMulti:array<number>, captionOffset:array<number>, captionRotation:number, caretSymbol:string, contents:string, creationDate:string, cutouts:array<[ [ number ] ]>, cutoutsPaths:array<[ [ number ] ]>, dash:array<number>, do

### PUT /publicapi/v2/sessions/{sessionId}/files/{fileId}/markups/{markupId}/status
Updates the status of a Session markup.
Body (application/json): Model:string, State:string
Response 200: Model:string, State:string

### GET /publicapi/v2/sessions/{sessionId}/files/{fileId}/statuses
Returns a list of valid statuses for markups on a document.
Response 200: [ Model:string, State:string ]

## SessionPermissions

### GET /publicapi/v1/sessions/{sessionId}/permissions
Get Studio Session permissions
Response 200: SessionPermissions:array<Allow*:string, Type*:string>

### PUT /publicapi/v1/sessions/{sessionId}/permissions
Update Studio Session permissions.
Body (application/json): Allow*:string, Type*:string
Response 204: Success

## SessionUserPermissions

### GET /publicapi/v1/sessions/{sessionId}/users/{userId}/permissions
Get Studio Session user permissions
Response 200: SessionPermissions:array<Allow*:string, Type*:string>

### PUT /publicapi/v1/sessions/{sessionId}/users/{userId}/permissions
Update Studio Session user permissions.
Body (application/json): Allow*:string, Type*:string
Response 204: Success

## SessionUsers

### POST /publicapi/v1/sessions/{sessionId}/invite
Invite user to Studio Session by email
Body (application/json): Email:string
Response 204: Success

### GET /publicapi/v1/sessions/{sessionId}/users
Get all users in a Studio Session
Query: ?offset:integer, ?limit:integer
Response 200: SessionUsers:array<Email:string, Id:integer, IsSessionOwner:boolean, Name:string, RestrictedStatus:string, Status:string, StatusMessage:string>, TotalCount:integer

### POST /publicapi/v1/sessions/{sessionId}/users
Add user to a Studio Session
Body (application/json): Email*:string, SendEmail:boolean
Response 204: Success

### GET /publicapi/v1/sessions/{sessionId}/users/{id}
Get a single user in a Studio Session
Response 200: Email:string, Id:integer, IsSessionOwner:boolean, Name:string, RestrictedStatus:string, Status:string, StatusMessage:string

### PUT /publicapi/v1/sessions/{sessionId}/users/{id}
Update user in a Studio Session.
Body (application/json): RestrictedStatus:string, StatusMessage:string
Response 204: Success

## Sessions

### GET /publicapi/v1/sessions
Get all Studio Sessions
Query: ?orderby:string, ?offset:integer, ?limit:integer, ?includeDeleted:boolean, ?ownedOrAttending:string
Response 200: Sessions:array<Created:string, ExpirationDate:string, Id:string, InviteUrl:string, Name:string, OwnerEmail:string, Restricted:boolean, SessionEndDate:string, Status:string, Version:integer>, TotalCount:integer

### POST /publicapi/v1/sessions
Create a Studio Session
Body (application/json): DefaultPermissions:array<Allow*:string, Type*:string>, Name*:string, Notification:boolean, Restricted:boolean, SessionEndDate:string
Response 200: Id:string

### DELETE /publicapi/v1/sessions/{id}
Delete a Studio Session
Response 204: Success

### GET /publicapi/v1/sessions/{id}
Get a single Studio Session metadata
Response 200: Created:string, ExpirationDate:string, Id:string, InviteUrl:string, Name:string, OwnerEmail:string, Restricted:boolean, SessionEndDate:string, Status:string, Version:integer

### PUT /publicapi/v1/sessions/{id}
Update a Studio Session.
Body (application/json): Name:string, Notification:boolean, OwnerEmailOrId:string, Restricted:boolean, SessionEndDate:string, Status:string
Response 200: Created:string, ExpirationDate:string, Id:string, InviteUrl:string, Name:string, OwnerEmail:string, Restricted:boolean, SessionEndDate:string, Status:string, Version:integer

## Users

### GET /publicapi/v1/users/me
Get info about currently authenticated user
Response 200: DisplayName:string, Email:string, PrimeMemberRole:string, UserId:integer, UserRole:array<string>

### PUT /publicapi/v1/users/me
Get info about currently authenticated user
Body (application/json): DisplayName*:string
Response 200: DisplayName:string, Email:string, PrimeMemberRole:string, UserId:integer, UserRole:array<string>

## Version

### GET /publicapi/api/version
Get Current Version
Response 200: object

## Webhooks

### GET /publicapi/v2/subscriptions
Returns a list of subscriptions the user has access to.
Response 200: subscriptions:array<callbackURI:string, clientId:string, created:string, creatorEmail:string, resourceId:string, sourceType:string, subscriptionId:string, subscriptionStatus:string, updated:string>

### POST /publicapi/v2/subscriptions
Creates a new subscription on a Studio Project or Session.
Body (application/json): callbackURI*:string, resourceId*:string, sourceType*:string
Response 200: callbackURI:string, clientId:string, created:string, creatorEmail:string, resourceId:string, sourceType:string, subscriptionId:string, subscriptionStatus:string, updated:string

### PUT /publicapi/v2/subscriptions
Updates a subscription.
Body (application/json): callbackURI*:string, subscriptionId*:string
Response 200: callbackURI:string, clientId:string, created:string, creatorEmail:string, resourceId:string, sourceType:string, subscriptionId:string, subscriptionStatus:string, updated:string

### DELETE /publicapi/v2/subscriptions/{subscriptionId}
Deletes a subscription.
Response 204: Success

### GET /publicapi/v2/subscriptions/{subscriptionId}
Returns a single subscription.
Response 200: callbackURI:string, clientId:string, created:string, creatorEmail:string, resourceId:string, sourceType:string, subscriptionId:string, subscriptionStatus:string, updated:string
