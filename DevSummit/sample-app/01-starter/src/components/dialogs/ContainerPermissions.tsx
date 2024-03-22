import { useState, useEffect } from "react";
import {
  NewFilled,
  DeleteRegular
} from "@fluentui/react-icons";
import {
  Button, Tag, Avatar, Text, Spinner,
  Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTitle,
  DataGrid, DataGridHeader, DataGridHeaderCell, DataGridBody, DataGridRow, DataGridCell,
  Dropdown, Option, SelectionEvents, OptionOnSelectData,
  TableColumnDefinition, TableCellLayout, TableRowId, createTableColumn,
  SelectionItemId,
  makeStyles, shorthands
} from "@fluentui/react-components";
import { IContainerPermission } from "../../common";
import * as MOCKS from "../../mock-data";

const useStyles = makeStyles({
  addFormContainer: {
    ...shorthands.borderWidth('2px'),
    ...shorthands.borderRadius('10px'),
    ...shorthands.padding('5px'),
    backgroundColor: 'lightgray',
  },
  addForm: {
    display: 'flex',
    flexDirection: 'row',
    columnGap: '10px',
    ...shorthands.margin('5px', '0px', '25px')
  }
});

const CONTAINER_ROLES = ["Owner", "Manager", "Writer", "Reader"];

export interface IDialogContainerPermissionsProps {
  isOpen: boolean;
  containerId: string;
  onClose?: () => void;
}

export const DialogContainerPermissions = (props: IDialogContainerPermissionsProps) => {

  const [containerPermissions, setContainerPermissions] = useState<IContainerPermission[]>([]);

  const [newPermissionRole, setNewPermissionRole] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<SelectionItemId>>(new Set<TableRowId>([1]));

  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    resetForm();
  }, [props.isOpen]);

  useEffect(() => {
    (async () => {
      if (props.containerId && props.isOpen) {
        await loadItems();
      }
    })();
  }, [props.containerId, props.isOpen]);

  const loadItems = async () => {
    const containerPermissions = await MOCKS.getContainerPermissions(props.containerId);
    setContainerPermissions(containerPermissions || []);
  };

  const resetForm = () => {
    setNewPermissionRole('');
  };

  const onPermissionDropdownChange = (event: SelectionEvents, data: OptionOnSelectData) => {
    setNewPermissionRole(data.optionValue as string);
  };

  const onAddPermission = async () => {
    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 750));

    setContainerPermissions([...containerPermissions, {
      id: "permission-4",
      roles: [newPermissionRole],
      user: {
        displayName: "Della Dennis",
        email: "dellad@contoso.onmicrosoft.com",
        userPrincipalName: "dellad@contoso.onmicrosoft.com"
      }
    }]);

    setIsAdding(false);
  };

  const onDeletePermission = async (permission: IContainerPermission) => {
    setIsDeleting(true);
    await new Promise(resolve => setTimeout(resolve, 750));

    const newContainerPermissions = containerPermissions.slice(0, containerPermissions.length - 1);
    setContainerPermissions(newContainerPermissions);

    setIsDeleting(false);
  };

  const columns: TableColumnDefinition<IContainerPermission>[] = [
    createTableColumn({
      columnId: 'permissionUser',
      renderHeaderCell: () => {
        return 'User'
      },
      renderCell: (containerPermission) => {
        return (
          <TableCellLayout>
            {containerPermission.user.displayName}
          </TableCellLayout>
        )
      }
    }),
    createTableColumn({
      columnId: 'permissionRoles',
      renderHeaderCell: () => {
        return 'Roles'
      },
      renderCell: (containerPermission) => {
        return (
          <TableCellLayout>
            {containerPermission.roles.join(', ')}
          </TableCellLayout>
        )
      }
    }),
    createTableColumn({
      columnId: 'actions',
      renderHeaderCell: () => {
        return 'Actions'
      },
      renderCell: (permission) => {
        return (
          <>
            <Button aria-label="Delete"
              disabled={isAdding || isDeleting}
              icon={deleteButtonIcon}
              onClick={() => { onDeletePermission(permission); }}>Delete</Button>
          </>
        )
      }
    })
  ];

  const columnSizingOptions = {
    permissionUser: {
      minWidth: 150,
      defaultWidth: 250,
      idealWidth: 200
    },
    permissionRoles: {
      minWidth: 150,
      defaultWidth: 150
    },
    actions: {
      minWidth: 250,
      defaultWidth: 250
    }
  };

  const addButtonIcon = (isAdding) ? <Spinner size='tiny' /> : <NewFilled />;
  const deleteButtonIcon = (isDeleting) ? <Spinner size='tiny' /> : <DeleteRegular />;

  const styles = useStyles();

  return (
    <Dialog open={props.isOpen} modalType='modal'>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Container Permissions</DialogTitle>

          <DialogContent>
            <div className={styles.addFormContainer}>
              <Text size={400} weight='bold'>Add permission:</Text>
              <div className={styles.addForm}>
                <Tag
                  dismissible
                  size='medium'
                  media={<Avatar name='Adele Vance' badge={{ status: "available" }} />}
                  dismissIcon={{ "aria-label": "remove" }}>Adele Vance</Tag>
                <Dropdown
                  placeholder="Select a role"
                  disabled={isAdding || isDeleting}
                  value={newPermissionRole}
                  onOptionSelect={onPermissionDropdownChange}>
                  {CONTAINER_ROLES.map((role) => (
                    <Option key={role} value={role}>{role}</Option>
                  ))}
                </Dropdown>
                <Button
                  appearance='primary'
                  disabled={isAdding || isDeleting || newPermissionRole === ''}
                  icon={addButtonIcon}
                  onClick={onAddPermission}>Add</Button>
              </div>
            </div>

            <DataGrid
              items={containerPermissions}
              columns={columns}
              columnSizingOptions={columnSizingOptions}
              getRowId={(item) => item.id}
              selectionMode='single'
              selectedItems={selectedRows}
              onSelectionChange={(e, d) => { setSelectedRows(d.selectedItems); }}>
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<any>>
                {({ item, rowId }) => (
                  <DataGridRow<any> key={rowId}>
                    {({ renderCell, columnId }) => (
                      <DataGridCell>
                        {renderCell(item)}
                      </DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </DialogContent>

          <DialogActions>
            <Button
              appearance='secondary'
              disabled={isAdding || isDeleting}
              onClick={() => { if (props.onClose) { props.onClose(); } }}>Close</Button>
          </DialogActions>

        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
