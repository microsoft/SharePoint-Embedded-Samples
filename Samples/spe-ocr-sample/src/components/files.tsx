import React, {
  useState,
  useEffect,
  useRef
} from 'react';
import { Providers } from "@microsoft/mgt-element";
import {
  AddRegular, ArrowUploadRegular,
  FolderRegular, DocumentRegular,
  SaveRegular, DeleteRegular,
} from '@fluentui/react-icons';
import {
  Button, Link, Label, Spinner,
  Input, InputProps, InputOnChangeData,
  Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTitle, DialogTrigger,
  DataGrid, DataGridProps,
  DataGridHeader, DataGridHeaderCell,
  DataGridBody, DataGridRow,
  DataGridCell,
  TableColumnDefinition, createTableColumn,
  TableRowId,
  TableCellLayout,
  OnSelectionChangeData,
  SelectionItemId,
  Toolbar, ToolbarButton,
  makeStyles
} from "@fluentui/react-components";
import {
  DriveItem
} from "@microsoft/microsoft-graph-types-beta";
import { IContainer } from "./../common/IContainer";
require('isomorphic-fetch');

interface IFilesProps {
  container: IContainer;
}

interface IDriveItemExtended extends DriveItem {
  isFolder: boolean;
  modifiedByName: string;
  iconElement: JSX.Element;
  downloadUrl: string;
}

const useStyles = makeStyles({
  dialogInputControl: {
    width: '400px',
  },
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '10px',
    marginBottom: '25px'
  }
});

export const Files = (props: IFilesProps) => {
  const [driveItems, setDriveItems] = useState<IDriveItemExtended[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<SelectionItemId>>(new Set<TableRowId>([1]));
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  const [folderId, setFolderId] = useState<string>('root');
  const [folderName, setFolderName] = useState<string>('');
  const [creatingFolder, setCreatingFolder] = useState<boolean>(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const uploadFileRef = useRef<HTMLInputElement>(null);

  // BOOKMARK 1 - constants & hooks

  useEffect(() => {
    (async () => {
      loadItems();
    })();
  }, [props]);

  const loadItems = async (itemId?: string) => {
    try {
      const graphClient = Providers.globalProvider.graph.client;
      const driveId = props.container.id;
      const driveItemId = itemId || 'root';

      // get Container items at current level
      const graphResponse = await graphClient.api(`/drives/${driveId}/items/${driveItemId}/children`).get();
      const containerItems: DriveItem[] = graphResponse.value as DriveItem[]
      const items: IDriveItemExtended[] = [];
      containerItems.forEach((driveItem: DriveItem) => {
        items.push({
          ...driveItem,
          isFolder: (driveItem.folder) ? true : false,
          modifiedByName: (driveItem.lastModifiedBy?.user?.displayName) ? driveItem.lastModifiedBy!.user!.displayName : 'unknown',
          iconElement: (driveItem.folder) ? <FolderRegular /> : <DocumentRegular />,
          downloadUrl: (driveItem as any)['@microsoft.graph.downloadUrl']
        });
      });
      setDriveItems(items);
    } catch (error: any) {
      console.error(`Failed to load items: ${error.message}`);
    }
  };

  const onSelectionChange: DataGridProps["onSelectionChange"] = (event: React.MouseEvent | React.KeyboardEvent, data: OnSelectionChangeData): void => {
    setSelectedRows(data.selectedItems);
  }
  const onDownloadItemClick = (downloadUrl: string) => {
    const link = downloadLinkRef.current;
    link!.href = downloadUrl;
    link!.click();
  }

  const onFolderCreateClick = async () => {
    setCreatingFolder(true);

    const currentFolderId = folderId;
    const graphClient = Providers.globalProvider.graph.client;
    const endpoint = `/drives/${props.container.id}/items/${currentFolderId}/children`;
    const data = {
      "name": folderName,
      "folder": {},
      "@microsoft.graph.conflictBehavior": "rename"
    };
    await graphClient.api(endpoint).post(data);

    await loadItems(currentFolderId);

    setCreatingFolder(false);
    setNewFolderDialogOpen(false);
  };

  const onHandleFolderNameChange: InputProps["onChange"] = (event: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData): void => {
    setFolderName(data?.value);
  };

  const onDeleteItemClick = async () => {
    const graphClient = Providers.globalProvider.graph.client;
    const endpoint = `/drives/${props.container.id}/items/${selectedRows.entries().next().value[0]}`;
    await graphClient.api(endpoint).delete();
    await loadItems(folderId || 'root');
    setDeleteDialogOpen(false);
  }

  const onUploadFileClick = () => {
    if (uploadFileRef.current) {
      uploadFileRef.current.click();
    }
  };

  const onUploadFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    fileReader.addEventListener('loadend', async (event: any) => {
      const graphClient = Providers.globalProvider.graph.client;
      const endpoint = `/drives/${props.container.id}/items/${folderId || 'root'}:/${file.name}:/content`;
      graphClient.api(endpoint).putStream(fileReader.result)
        .then(async (response) => {
          await loadItems(folderId || 'root');
        })
        .catch((error) => {
          console.error(`Failed to upload file ${file.name}: ${error.message}`);
        });
    });
    fileReader.addEventListener('error', (event: any) => {
      console.error(`Error on reading file: ${event.message}`);
    });
  };

  const previewFiles = async (item: DriveItem) => {

    const graphClient = Providers.globalProvider.graph.client;
    const driveId = props.container.id;
    
    const extension = item.name? (item.name).slice(((item.name).lastIndexOf(".") - 1 >>> 0) + 2) : '';
    const linkableFileTypes = new Set(["doc", "docx", "xlsx", "xls", "csv", "pptx", "ppt"]);
    const resp = await graphClient.api(`/drives/${driveId}/items/${item.id}/preview`).post({ });

    linkableFileTypes.has(extension) 
    ?
      window.open(item.webUrl!, '_blank') 
    :
      window.open(resp.getUrl + '&nb=true', '_blank');
  }

  // BOOKMARK 2 - handlers go here
  const columns: TableColumnDefinition<IDriveItemExtended>[] = [
    createTableColumn({
      columnId: 'driveItemName',
      renderHeaderCell: () => {
        return 'Name'
      },

      renderCell: (driveItem) => {
        return (
          <TableCellLayout media={driveItem.iconElement}>
            {(!driveItem.isFolder)
              ? <Link onClick={() => {
                previewFiles(driveItem);
              }}>{driveItem.name}</Link>

              //FOLDER
              : <Link onClick={() => {
                loadItems(driveItem.id);
                setFolderId(driveItem.id as string)
              }}>{driveItem.name}</Link>
            }
          </TableCellLayout>
        )
      }
    }),
    createTableColumn({
      columnId: 'lastModifiedTimestamp',
      renderHeaderCell: () => {
        return 'Last Modified'
      },
      renderCell: (driveItem) => {
        return (
          <TableCellLayout>
            {driveItem.lastModifiedDateTime}
          </TableCellLayout>
        )
      }
    }),
    createTableColumn({
      columnId: 'lastModifiedBy',
      renderHeaderCell: () => {
        return 'Last Modified By'
      },
      renderCell: (driveItem) => {
        return (
          <TableCellLayout>
            {driveItem.modifiedByName}
          </TableCellLayout>
        )
      }
    }),
    createTableColumn({
      columnId: 'actions',
      renderHeaderCell: () => {
        return 'Actions'
      },
      renderCell: (driveItem) => {
        return (
          <>
            <Button aria-label="Download"
              disabled={!selectedRows.has(driveItem.id as string)}
              icon={<SaveRegular />}
              onClick={() => onDownloadItemClick(driveItem.downloadUrl)}>Download</Button>

            <Button aria-label="Delete"
              icon={<DeleteRegular />}
              onClick={() => setDeleteDialogOpen(true)}>Delete</Button>
          </>
        )
      }
    }),
  ];
  const columnSizingOptions = {
    driveItemName: {
      minWidth: 150,
      defaultWidth: 250,
      idealWidth: 200
    },
    lastModifiedTimestamp: {
      minWidth: 150,
      defaultWidth: 150
    },
    lastModifiedBy: {
      minWidth: 150,
      defaultWidth: 150
    },
    actions: {
      minWidth: 250,
      defaultWidth: 250
    }
  };
  // BOOKMARK 3 - component rendering return (

  const styles = useStyles();

  return (
    <div>
      <input ref={uploadFileRef} type="file" onChange={onUploadFileSelected} style={{ display: 'none' }} />
      <a ref={downloadLinkRef} href="" target="_blank" style={{ display: 'none' }} />

      <Toolbar>
        <ToolbarButton vertical icon={<AddRegular />} onClick={() => setNewFolderDialogOpen(true)}>New Folder</ToolbarButton>
        <ToolbarButton vertical icon={<ArrowUploadRegular />} onClick={onUploadFileClick}>Upload File</ToolbarButton>
      </Toolbar>


      <Dialog open={newFolderDialogOpen}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogContent className={styles.dialogContent}>
              <Label htmlFor={folderName}>Folder name:</Label>
              <Input id={folderName} className={styles.dialogInputControl} autoFocus required
                value={folderName} onChange={onHandleFolderNameChange}></Input>
              {creatingFolder &&
                <Spinner size='medium' label='Creating folder...' labelPosition='after' />
              }
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" onClick={() => setNewFolderDialogOpen(false)} disabled={creatingFolder}>Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary"
                onClick={onFolderCreateClick}
                disabled={creatingFolder || (folderName === '')}>Create Folder</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={deleteDialogOpen} modalType='modal' onOpenChange={() => setSelectedRows(new Set<TableRowId>([0]))}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogContent>
              <p>Are you sure you want to delete this item?</p>
            </DialogContent>
            <DialogActions>
              <DialogTrigger>
                <Button
                  appearance='secondary'
                  onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              </DialogTrigger>
              <Button
                appearance='primary'
                onClick={onDeleteItemClick}>Delete</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <DataGrid
        items={driveItems}
        columns={columns}
        getRowId={(item) => item.id}
        resizableColumns
        columnSizingOptions={columnSizingOptions}
        selectionMode='single'
        selectedItems={selectedRows}
        onSelectionChange={onSelectionChange}
      >
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => (
              <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
            )}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<IDriveItemExtended>>
          {({ item, rowId }) => (
            <DataGridRow<IDriveItemExtended> key={rowId}>
              {({ renderCell, columnId }) => (
                <DataGridCell>
                  {renderCell(item)}
                </DataGridCell>
              )}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
}

export default Files;