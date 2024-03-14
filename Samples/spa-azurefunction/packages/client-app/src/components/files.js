import React from 'react';
import { Providers } from '@microsoft/mgt-element';
import {
  Breadcrumb,
  CommandBar,
  CommandBarButton,
  DefaultButton,
  DetailsList,
  DetailsListLayoutMode,
  Dialog,
  DialogType,
  DialogFooter,
  Icon,
  Link,
  mergeStyleSets,
  PrimaryButton,
  Selection,
  SelectionMode,
  Spinner,
  TextField,
  Text,
  TooltipHost,
  IconButton,
  SearchBox,
  Stack,
  Label,
  Modal
} from '@fluentui/react';
import { getFileTypeIconProps, FileIconType } from '@fluentui/react-file-type-icons';
import { Search } from '@fluentui/react-icons';
import Permissions from './permissions.js';

const classNames = mergeStyleSets({
  fileIconHeaderIcon: {
    padding: 0,
    fontSize: '16px',
  },
  fileIconCell: {
    textAlign: 'center',
    selectors: {
      '&:before': {
        content: '.',
        display: 'inline-block',
        verticalAlign: 'middle',
        height: '100%',
        width: '0px',
        visibility: 'hidden',
      },
    },
  },
  fileIconImg: {
    verticalAlign: 'middle',
    maxHeight: '16px',
    maxWidth: '16px',
  },
  controlWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  exampleToggle: {
    display: 'inline-block',
    marginBottom: '10px',
    marginRight: '30px',
  },
  selectionDetails: {
    marginBottom: '20px',
  },
  container: {
    display: 'flex',
    flexFlow: 'column nowrap',
    alignItems: 'stretch',
  },
  driveItemPermissionsHeader: {
    textAlign: 'center',
    fontSize: '1rem',
    marginTop: '5px'
  }
});
const folderDialogProps = {
  type: DialogType.largeHeader,
  title: 'Create a new folder',
};
const shareDialogProps = {
  type: DialogType.normal,
  title: 'Copy Sharing Link',
};
const previewDialogProps = {
  type: DialogType.normal,
  title: 'Creating Preview Link',
};
const shareDialogModalProps = {
  isBlocking: true,
}
const deleteDialogProps = {
  type: DialogType.normal,
  title: 'Delete?',
  subText: 'Are you sure you want to send this item to the recycle bin?',
};
const renameDialogProps = {
  type: DialogType.normal,
  title: 'Rename',
};
const driveItemPermissionsDialogProps = {
  type: DialogType.normal,
  title: 'Permissions',
  closeButtonAriaLabel: 'Close',
  styles: {
    content: {
      width: '500px'
    }
  }
};


export default class Files extends React.Component {

  constructor(props) {
    super(props);

    this.fileUploadRef = React.createRef();
    this.downloadLinkRef = React.createRef();

    const linkableFileTypes = new Set(["doc", "docx", "xlsx", "xls", "csv", "pptx", "ppt"]);
    const columns = [
      {
        key: 'column1',
        name: 'File Type',
        className: classNames.fileIconCell,
        iconClassName: classNames.fileIconHeaderIcon,
        ariaLabel: 'Column operations for File type, Press to sort on File type',
        iconName: 'Page',
        isIconOnly: true,
        fieldName: 'name',
        minWidth: 16,
        maxWidth: 16,
        onRender: (item) => (
          <TooltipHost content={item.fileType}>
            <Icon iconName={item.iconName} className={classNames.fileIconImg} alt={`${item.fileType} icon`} />
          </TooltipHost>
        ),
      },
      {
        key: 'column2',
        name: 'Name',
        fieldName: 'name',
        minWidth: 210,
        maxWidth: 350,
        isRowHeader: true,
        isResizable: true,
        isSorted: true,
        isSortedDescending: false,
        sortAscendingAriaLabel: 'Sorted A to Z',
        sortDescendingAriaLabel: 'Sorted Z to A',
        data: 'string',
        isPadded: true,
        onRender: (item) => {
          if (item.folder === true) {
            return (
              <Link key={item.key} onClick={() => this._onFileClick(item)}>
                {item.name}
              </Link>
            );
          } else {
            return (
              linkableFileTypes.has(item.extension) ?
                <Link key={item.key} href={item.webUrl} target="_blank">
                  {item.displayName}
                </Link>
                :
                <Link key={item.key} onClick={() => this.previewItem(item.id)}>
                  {item.displayName}
                </Link>
            );
          }
        },
      },
      {
        key: 'column3',
        name: 'Date Modified',
        fieldName: 'dateModifiedValue',
        minWidth: 70,
        maxWidth: 90,
        isResizable: true,
        data: 'number',
        onRender: (item) => {
          return <span>{item.dateModified}</span>;
        },
        isPadded: true,
      },
      {
        key: 'column4',
        name: 'Modified By',
        fieldName: 'modifiedBy',
        minWidth: 70,
        maxWidth: 90,
        isResizable: true,
        isCollapsible: true,
        data: 'string',
        onRender: (item) => {
          return <span>{item.modifiedBy}</span>;
        },
        isPadded: true,
      },
      {
        key: 'column5',
        name: 'File Size',
        fieldName: 'fileSizeRaw',
        minWidth: 70,
        maxWidth: 90,
        isResizable: true,
        isCollapsible: true,
        data: 'number',
        onRender: (item) => {
          return <span>{item.fileSize}</span>;
        },
      },
    ];
    this.baseCommands = [
      {
        key: 'refresh',
        onRender: (item) => (
          !this.state.searchInProgress &&
          <CommandBarButton
            iconProps={{ iconName: 'Refresh' }}
            text=''
            onClick={() => this.loadItems()}
          />
        )
      },
      {
        key: 'newFolder',
        onRender: (item) => (
          !this.state.searchInProgress &&
          <CommandBarButton
            iconProps={{ iconName: 'Add' }}
            text='New Folder'
            onClick={() => this.toggleNewFolderDialog()}
          />
        )
      },
      {
        key: 'uploadFiles',
        onRender: (item) => (
          !this.state.searchInProgress &&
          <CommandBarButton
            iconProps={{ iconName: "Upload" }}
            text='Upload Files'
            onClick={() => this.clickUpload()}
          />
        )
      },
      {
        key: "upload-dummy",
        name: "Upload Files Dummy",
        onRender: () => <input ref={this.fileUploadRef} style={{ display: "none" }} type="file" multiple onChange={this.onFilesSelected.bind(this)} />
      },
      {
        key: 'uploadStatus',
        name: 'Upload Status',
        onRender: () => { this.state.pendingUploads > 0 && (<div>Uploading {this.state.pendingUploads} files</div>) }
      },
      {
        key: 'searchLabel',
        onRender: (item) => (
          this.state.searchInProgress &&
          <CommandBarButton> <Label>Search:</Label> </CommandBarButton>
        )
      },
      {
        key: 'search',
        onRender: (item) => <CommandBarButton> <TextField name='searchInput' placeholder='Search Container...' value={this.state.searchTerm} onChange={this.updateSearchTerm} /> </CommandBarButton>,
      },
      {
        key: 'searchButton',
        onRender: (item) => <CommandBarButton iconProps={{ iconName: "Search" }} onClick={() => this.handleSearch()} />
      },
      {
        key: 'containerPermissions',
        onRender: (item) => <CommandBarButton iconProps={{ iconName: "People" }} onClick={() => this.openPermissionsView()} />
      },
      {
        key: 'closeButton',
        onRender: (item) => (
          this.state.searchInProgress &&
          <CommandBarButton
            iconProps={{ iconName: "ChromeClose" }}
            onClick={() => this.handleCancelSearch()}
          />
        )
      },
      {
        key: 'searchSpinner',
        onRender: (item) => (
          this.state.searchQueryInProgress &&
          <CommandBarButton>
            <div>
              <Spinner label="Searching files..." />
            </div>
          </CommandBarButton>
        )
      },
    ];
    this.folderCommands = [
      {
        key: 'share',
        text: 'Share',
        iconProps: { iconName: 'Share' },
        subMenuProps: {
          items: [
            {
              key: 'shareEdit',
              text: 'Create Editable Link',
              onClick: this.createEditLink.bind(this),
            },
            {
              key: 'shareRead',
              text: 'Create View-only Link',
              onClick: this.createViewLink.bind(this),
            },
          ],
        },
      },
      {
        key: 'delete',
        text: 'Delete',
        iconProps: { iconName: 'Delete' },
        onClick: this.showDeleteItemDialog.bind(this),
      },
      {
        key: 'rename',
        text: 'Rename',
        iconProps: { iconName: 'Rename' },
        onClick: this.showRenameDialog.bind(this),
      },
      {
        key: 'permissions',
        text: 'Permissions',
        iconProps: { iconName: "People" },
        onClick: this.showDriveItemPermissions.bind(this)
      }
    ];
    this.fileCommands = [
      {
        key: 'download',
        text: 'Download',
        iconProps: { iconName: 'Download' },
        onClick: this.downloadFile.bind(this),
      },

      ...this.folderCommands
    ];
    this.selection = new Selection({
      onSelectionChanged: () => {
        if (this.selection.getSelectedCount() === 1) {
          const item = this.selection.getSelection()[0];
          if (item.folder) {
            this.setState({ commands: this.folderCommands });
          } else {
            this.setState({ commands: this.fileCommands });
          }
        } else {
          this.setState({ commands: this.baseCommands });
        }

      }
    });

    this.state = {
      itemId: '',
      breadcrumbs: [{
        key: '',
        text: this.props.container.displayName,
        onClick: this.onBreadcrumbClick.bind(this),
      }],
      items: [],
      searchItems: [],
      driveItemPermissions: [],
      downloadUrlMap: new Map(),
      columns: columns,
      commands: this.baseCommands,
      loadingFiles: false,
      pendingUploads: 0,
      uploadsPanel: false,
      name: '',
      newFolderDialog: false,
      selectedItems: 0,
      shareDialog: false,
      previewDialog: false,
      shareLink: '',
      deleteDialog: false,
      renameDialog: false,
      searchTerm: '',
      searchInProgress: false,
      searchQueryInProgress: false,
      showPermissions: false,
      isDriveItemPermissionDialogOpen: false
    };
  };

  componentDidMount() {
    this.loadItems();
  }

  componentDidUpdate(prevProps) {
    if (this.props.container.id !== prevProps.container.id) {
      this.setState({
        itemId: '',
        breadcrumbs: [{
          key: '',
          text: this.props.container.displayName,
          onClick: this.onBreadcrumbClick.bind(this),
        }],
        items: [],
      });
      this.loadItems();
    }
  }

  updateSearchTerm = (event, inputText) => {
    this.setState({ searchTerm: inputText });
  };

  onNameChange(ev, name) {
    this.setState({ name: name });
  }

  toggleNewFolderDialog() {
    this.setState({
      newFolderDialog: !this.state.newFolderDialog,
      name: this.state.newFolderDialog ? this.state.name : '',
    });
  }

  openPermissionsView() {
    this.setState({
      showPermissions: true,
    })
  }

  closePermissionsView() {
    this.setState({
      showPermissions: false
    })
  }

  hideShareDialog() {
    this.setState({
      shareDialog: false,
      shareLink: '',
    });
  }

  showDeleteItemDialog() {
    this.setState({
      deleteDialog: true,
    });
  }

  hideDeleteItemDialog() {
    this.setState({
      deleteDialog: false,
    });
  }

  hidePreviewDialog() {
    this.setState({
      previewDialog: false,
    });
  }

  showRenameDialog() {
    this.setState({
      renameDialog: true,
      name: this.selection.getSelection()[0].displayName,
    });
  }

  hideRenameDialog() {
    this.setState({
      renameDialog: false,
      name: '',
    });
  }

  hideDriveItemPermissionsDialog() {
    this.setState({
      isDriveItemPermissionDialogOpen: false
    })
  }

  downloadFile() {
    const a = this.downloadLinkRef.current;
    a.href = this.selection.getSelection()[0].downloadUrl;
    a.click();
  }

  getDisplayName(name) {
    return name.replace('.' + this.getFileExtension(name), '');
  }

  getFileExtension(name) {
    return name.split('.').pop();
  }

  getIconNameFromFilename(name, size = 16) {
    const ext = this.getFileExtension(name);
    return getFileTypeIconProps({ extension: ext, size: size }).iconName;
  }

  humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
      return bytes + ' B';
    }
    const units = si
      ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
      : ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let u = -1;
    const r = 10 ** dp;
    do {
      bytes /= thresh;
      ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
    return bytes.toFixed(dp) + ' ' + units[u];
  }

  async loadItems(itemId) {
    this.setState({ loadingFiles: true });
    const items = [];
    try {
      let graphClient = Providers.globalProvider.graph.client;
      let driveId = this.props.container.id;
      let id = itemId || 'root';
      const itemsResp = await graphClient.api(`/drives/${driveId}/items/${id}/children`).get();
      itemsResp.value.forEach(i => {
        let iconName, fileType, fileSize, fileSizeRaw;
        if (i.folder) {
          fileType = 'folder';
          iconName = getFileTypeIconProps({ type: FileIconType.folder, size: 16 }).iconName;
          fileSizeRaw = i.folder.childCount;
          fileSize = `${fileSizeRaw} item` + (fileSizeRaw > 1 || fileSizeRaw === 0 ? 's' : '');

        } else {
          iconName = this.getIconNameFromFilename(i.name);
          fileSizeRaw = i.size;
          fileSize = this.humanFileSize(fileSizeRaw, false, 0);
        }
        items.push({
          id: i.id,
          key: i.id,
          name: i.name,
          displayName: this.getDisplayName(i.name),
          extension: this.getFileExtension(i.name),
          value: i.name,
          folder: i.folder ? true : false,
          iconName: iconName,
          fileType: fileType,
          modifiedBy: i.lastModifiedBy.user.displayName,
          dateModified: i.lastModifiedDateTime,
          dateModifiedValue: i.lastModifiedDateTime,
          fileSize: fileSize,
          fileSizeRaw: fileSizeRaw,
          downloadUrl: i['@microsoft.graph.downloadUrl'],
          webUrl: i.webUrl,
        });

        // build downloadUrlMap for search functionality
        this.state.downloadUrlMap.set(i.id, i['@microsoft.graph.downloadUrl']);
      });
      this.setState({ items: items });
    } catch (e) {
      console.error("Failed to load files: " + e.message);
    }
    this.setState({
      items: items,
      loadingFiles: false,
    });
  }

  _onFileClick(item) {
    if (item.folder) {
      const bc = {
        key: item.id,
        text: item.name,
        onClick: this.onBreadcrumbClick.bind(this),
      };

      this.setState(previous => ({
        itemId: item.id,
        breadcrumbs: [...previous.breadcrumbs, bc],
        items: [],
        searchInProgress: false,
        searchTerm: ''
      }));


      this.loadItems(item.id);
    }
  }

  onBreadcrumbClick(e, item) {
    let updated = [];
    this.state.breadcrumbs.some((value) => {
      updated.push(value);
      return value.key === item.key;
    });
    this.setState({
      itemId: item.key,
      breadcrumbs: updated,
      items: [],
    });
    this.loadItems(item.key);
  }

  onFileClicked(e) {
    const item = e.detail;
    if (item.folder) {
      const bc = {
        key: item.id,
        text: item.name,
        onClick: this.onBreadcrumbClick.bind(this),
      };
      this.setState(previous => ({
        itemId: item.id,
        breadcrumbs: [...previous.breadcrumbs, bc],
      }));
      this.loadItems(item.id);
    }
  }

  async createFolder() {
    let graphClient = Providers.globalProvider.graph.client;
    let driveId = this.props.container.id;
    let id = this.state.itemId || 'root'
    let data = {
      "name": this.state.name,
      "folder": {},
      "@microsoft.graph.conflictBehavior": "rename"
    }
    let createFolderResponse = await graphClient.api(`/drives/${driveId}/items/${id}/children`).post(data);
    this.toggleNewFolderDialog();
    this.loadItems(this.state.itemId);
  }

  createEditLink() {
    this.shareItem('edit');
  }
  createViewLink() {
    this.shareItem('view');
  }

  async shareItem(permType) {
    let graphClient = Providers.globalProvider.graph.client;
    let driveId = this.props.container.id;
    let id = this.selection.getSelection()[0].id;
    let permission = {
      "type": permType,
      "scope": "organization"
    }
    const resp = await graphClient.api(`/drives/${driveId}/items/${id}/createLink`).post(permission);
    this.setState({
      shareDialog: true,
      shareLink: resp.link.webUrl,
    });
  }

  async previewItem(id) {
    this.setState({
      previewDialog: true
    });
    let graphClient = Providers.globalProvider.graph.client;
    let driveId = this.props.container.id;

    const resp = await graphClient.api(`/drives/${driveId}/items/${id}/preview`).post({ });
    this.setState({
      previewDialog: false
    });
    window.open(resp.getUrl + '&nb=true', '_blank');
  }

  showDriveItemPermissions() {
    this.getDriveItemPermissions();
  }

  async getDriveItemPermissions() {
    let graphClient = Providers.globalProvider.graph.client;
    let driveId = this.props.container.id;
    let id = this.selection.getSelection()[0].id;
    const resp = await graphClient.api(`/drives/${driveId}/items/${id}/permissions`).get();
    const itemPermissions = this.parsePermissions(resp)
    this.setState({
      isDriveItemPermissionDialogOpen: true,
      driveItemPermissions: itemPermissions
    })
  }

  async deleteDriveItemPermission(permissionId) {
    let graphClient = Providers.globalProvider.graph.client;
    let driveId = this.props.container.id;
    let id = this.selection.getSelection()[0].id;
    const resp = await graphClient.api(`/drives/${driveId}/items/${id}/permissions/${permissionId}`).delete();
    this.setState({
      isDriveItemPermissionDialogOpen: false
    })
  }

  parsePermissions(response) {
    const permissions = response.value;
    const result = permissions.map(permission => {
      const { id, roles, link } = permission;

      if (link) {
        const webUrl = link.webUrl;
        const linkType = link.type;
        return { id, roles, webUrl, linkType };
      }
      const grantedTo = permission.grantedToV2?.siteGroup || permission.grantedTo?.user || {};
      const { displayName } = grantedTo;
      return { id, displayName, roles };
    });
    return result;
  }

  async deleteItem() {
    let graphClient = Providers.globalProvider.graph.client;
    let driveId = this.props.container.id;
    let id = this.selection.getSelection()[0].id;
    const resp = await graphClient.api(`/drives/${driveId}/items/${id}`).delete();
    this.setState({
      deleteDialog: false,
    });
    this.loadItems(this.state.itemId);
  }

  async renameItem() {
    let graphClient = Providers.globalProvider.graph.client;
    let driveId = this.props.container.id;
    let item = this.selection.getSelection()[0];
    let id = item.id;
    let name = item.folder === true ? this.state.name : this.state.name + '.' + item.extension;
    let data = {
      name: name
    };
    const resp = await graphClient.api(`/drives/${driveId}/items/${id}`).patch(data);
    this.hideRenameDialog();
    this.loadItems(this.state.itemId);
  }

  async handleSearch() {
    let graphClient = Providers.globalProvider.graph.client;
    let driveId = this.props.container.id;
    this.setState({ searchInProgress: true, searchQueryInProgress: true });
    const searchResponse = await graphClient.api(`/drives/${driveId}/root/search(q='${this.state.searchTerm}')`).get();
    const searchItems = [];
    searchResponse.value.forEach(i => {
      let iconName, fileType, fileSize, fileSizeRaw;
      if (i.folder) {
        fileType = 'folder';
        iconName = getFileTypeIconProps({ type: FileIconType.folder, size: 16 }).iconName;
        fileSizeRaw = i.folder.childCount;
        fileSize = `${fileSizeRaw} item` + (fileSizeRaw > 1 || fileSizeRaw === 0 ? 's' : '');

      } else {
        iconName = this.getIconNameFromFilename(i.name);
        fileSizeRaw = i.size;
        fileSize = this.humanFileSize(fileSizeRaw, false, 0);
      }

      // forego returning folders in search results, as it causes issues in breadcrumb generation
      !i.folder &&
        searchItems.push({
          id: i.id,
          key: i.id,
          name: i.name,
          downloadUrl: this.state.downloadUrlMap.get(i.id),
          displayName: this.getDisplayName(i.name),
          extension: this.getFileExtension(i.name),
          value: i.name,
          folder: i.folder ? true : false,
          iconName: iconName,
          fileType: fileType,
          modifiedBy: i.lastModifiedBy.user.displayName,
          dateModified: i.lastModifiedDateTime,
          dateModifiedValue: i.lastModifiedDateTime,
          fileSize: fileSize,
          fileSizeRaw: fileSizeRaw,
          webUrl: i.webUrl,
        });
    })
    console.log(this.state.items);
    console.log(searchItems);
    this.setState({ items: searchItems, searchQueryInProgress: false });
  }

  handleCancelSearch() {
    const id = this.state.itemId || 'root'
    this.setState({
      searchInProgress: false,
      searchTerm: ''
    });
    this.loadItems(id);
    console.log("Search canceled!")
  }

  addShareLinkToClipboard() {
    navigator.clipboard.writeText(this.state.shareLink);
  }


  clickUpload() {
    if (this.fileUploadRef.current) {
      this.fileUploadRef.current.click()
    }
  }

  onFilesSelected(ev) {
    //https://github.com/microsoft/fluentui/issues/4733
    const files = ev.target.files;
    let pendingUploads = files.length;
    this.setState({ pendingUploads: pendingUploads });
    const graphClient = Providers.globalProvider.graph.client;
    const driveId = this.props.container.id;
    const id = this.state.itemId || 'root'
    for (var i = 0; i < files.length; i++) {
      const f = files[i];
      const reader = new FileReader();
      reader.readAsArrayBuffer(f);
      reader.addEventListener('loadend', () => {
        let name = f.name;
        let content = reader.result;
        graphClient.api(`/drives/${driveId}/items/${id}:/${name}:/content`).putStream(content)
          .then((res) => {
            pendingUploads--;
            this.setState({ pendingUploads: pendingUploads });
            if (pendingUploads === 0) this.loadItems(id);
          })
          .catch((e) => {
            console.error(`Failed to upload file ${f.name} with ${e.message}`);
            this.setState((prev) => ({ pendingUploads: prev.pendingUploads - 1 }));
          });
      });
      reader.addEventListener('error', (e) => {
        this.setState((prev) => ({ pendingUploads: prev.pendingUploads - 1 }));
      });
    }
  }

  renderData = (permissions) => {
    return permissions.map((permission, index) => {
      return (
        <Stack style={{ backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px', margin: '10px', borderRadius: '5px', borderColor: 'black', borderStyle: 'solid' }} key={index} tokens={{ childrenGap: 10 }}>
          <p style={{ margin: 0 }}><strong>ID:</strong> {permission.id}</p>
          {permission.displayName && <p style={{ margin: 0 }}><strong>Display Name:</strong> {permission.displayName}</p>}
          <p style={{ margin: 0 }}><strong>Roles:</strong> {permission.roles.join(', ')}</p>
          {permission.linkType && <p style={{ margin: 0 }}><strong>Link Type:</strong> {permission.linkType}</p>}
          {permission.webUrl && <p style={{ margin: 0 }}><strong>Web URL:</strong> {permission.webUrl}</p>}
          {permission.linkType && permission.webUrl && <IconButton iconProps={{ iconName: 'Delete' }} title="Delete" ariaLabel="Delete" onClick={() => this.deleteDriveItemPermission(permission.id)} />}
        </Stack>
      );
    });
  };

  render() {
    const { items, columns, commands, breadcrumbs, loadingFiles, name, newFolderDialog, pendingUploads, shareDialog, previewDialog, shareLink, deleteDialog, renameDialog, searchInProgress, showPermissions, isDriveItemPermissionDialogOpen, driveItemPermissions } = this.state;
    return (
      <div>
        {!searchInProgress &&
          <Breadcrumb items={breadcrumbs} maxDisplayedItems={10} />
        }
        <Dialog
          hidden={!newFolderDialog}
          onDismiss={this.toggleNewFolderDialog.bind(this)}
          dialogContentProps={folderDialogProps}>
          <TextField label="Folder name" required value={name} onChange={this.onNameChange.bind(this)} />
          <DialogFooter>
            <PrimaryButton onClick={this.createFolder.bind(this)} text="Create" />
            <DefaultButton onClick={this.toggleNewFolderDialog.bind(this)} text="Cancel" />
          </DialogFooter>
        </Dialog>
        <Dialog
          hidden={!shareDialog}
          onDismiss={this.hideShareDialog.bind(this)}
          dialogContentProps={shareDialogProps}
          modalProps={shareDialogModalProps}
          minWidth="450px">
          <TextField label="Link" defaultValue={shareLink} readOnly />
          <DialogFooter>
            <PrimaryButton onClick={this.addShareLinkToClipboard.bind(this)} text="Copy" />
          </DialogFooter>
        </Dialog>
        <Dialog
          hidden={!previewDialog}
          onDismiss={this.hideShareDialog.bind(this)}
          dialogContentProps={previewDialogProps}
          modalProps={shareDialogModalProps}
          minWidth="450px">
          <Spinner label="Generating preview link..." />
          <DialogFooter>
            <DefaultButton onClick={this.hidePreviewDialog.bind(this)} text="Cancel" />
          </DialogFooter>
        </Dialog>
        <Dialog
          hidden={!deleteDialog}
          onDismiss={this.hideDeleteItemDialog.bind(this)}
          dialogContentProps={deleteDialogProps}>
          <DialogFooter>
            <PrimaryButton onClick={this.deleteItem.bind(this)} text="Delete" />
            <DefaultButton onClick={this.hideDeleteItemDialog.bind(this)} text="Cancel" />
          </DialogFooter>
        </Dialog>
        <Dialog
          hidden={!renameDialog}
          onDismiss={this.hideRenameDialog.bind(this)}
          dialogContentProps={renameDialogProps}>
          <TextField label="New name" required value={name} onChange={this.onNameChange.bind(this)} />
          <DialogFooter>
            <PrimaryButton onClick={this.renameItem.bind(this)} text="Rename" />
            <DefaultButton onClick={this.hideRenameDialog.bind(this)} text="Cancel" />
          </DialogFooter>
        </Dialog>
        <Modal
          isOpen={isDriveItemPermissionDialogOpen}
          onDismiss={this.hideDriveItemPermissionsDialog.bind(this)}
          isBlocking={false}
          containerClassName="modalContainer"
          styles={{ main: { minWidth: 500   } }}
        >
          <Stack tokens={{ childrenGap: 20 }}>
            <h1 className={classNames.driveItemPermissionsHeader}>Drive Item Sharing Permissions</h1>
            {this.renderData(driveItemPermissions)}
            <DefaultButton text="Close" onClick={this.hideDriveItemPermissionsDialog.bind(this)} />
          </Stack>
        </Modal>
        <a ref={this.downloadLinkRef} href="" target="_blank" style={{ display: 'none' }} />
        {!showPermissions && <CommandBar items={commands} />}
        {showPermissions &&
          <Permissions
            currentContainer={this.props.container}
            onContainerChange={this.props.onContainerChange}
            closePermissionsViewHandler={this.closePermissionsView.bind(this)}
            toggleView={() => this.openPermissionsView()}
          />
        }
        {!showPermissions &&
          <DetailsList
            items={items}
            compact={false}
            columns={columns}
            selectionMode={SelectionMode.single}
            selection={this.selection}
            layoutMode={DetailsListLayoutMode.justified}
            isHeaderVisible={true}
            selectionPreservedOnEmptyClick={true}
            enterModalSelectionOnTouch={true}
            ariaLabelForSelectionColumn="Toggle selection"
            ariaLabelForSelectAllCheckbox="Toggle selection for all items"
            checkButtonAriaLabel="select row"
          />
        }
        {loadingFiles && !showPermissions && (
          <div>
            <Spinner label="Loading files..." />
          </div>
        )}
        {!showPermissions && !loadingFiles && items.length === 0 && pendingUploads === 0 && (
          <div>
            Nothing here yet! Upload some files.
            <br />
            <br />
          </div>
        )}
        {pendingUploads > 0 && (
          <div>
            <Spinner label="Uploading files..." />
          </div>
        )}
      </div>
    );
  }
}
