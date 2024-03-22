import { useState, useEffect } from "react";
import {
  NewFilled,
  DeleteRegular
} from "@fluentui/react-icons";
import {
  Button, Input, Text, Spinner,
  Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTitle,
  DataGrid, DataGridHeader, DataGridHeaderCell, DataGridBody, DataGridRow, DataGridCell,
  TableColumnDefinition, TableCellLayout, TableRowId, createTableColumn,
  SelectionItemId,
  makeStyles, shorthands
} from "@fluentui/react-components";
import { Providers } from "@microsoft/mgt-element";
import { ColumnDefinition } from "@microsoft/microsoft-graph-types-beta";

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
  },
  inputBox: {
    width: '250px'
  }
});

export interface IDialogContainerColumnsProps {
  isOpen: boolean;
  containerId: string;
  onClose?: () => void;
}

export const DialogContainerColumns = (props: IDialogContainerColumnsProps) => {

  const [containerColumns, setContainerColumns] = useState<ColumnDefinition[]>([]);
  const [newColumnName, setNewColumnName] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<SelectionItemId>>(new Set<TableRowId>([1]));

  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    resetForm();
  }, [props.isOpen]);

  useEffect(() => {
    (async () => {
      if (props.containerId && props.isOpen) {
        await loadColumns();
      }
    })();
  }, [props.containerId, props.isOpen]);

  const resetForm = () => {
    setNewColumnName('');
  };

  const loadColumns = async () => {
    const graphClient = Providers.globalProvider.graph.client;
    const graphResponse = await graphClient.api(`/storage/fileStorage/containers/${props.containerId}/columns`)
      .version('beta')
      .get();

    const SystemColumns = new Set(['ID', 'Created', 'Author', 'Modified', 'Editor', '_CopySource', 'FileLeafRef', 'FileSizeDisplay', 'Title', '_ExtendedDescription']);
    const containerColumns: ColumnDefinition[] = graphResponse.value.filter((column: ColumnDefinition) => !SystemColumns.has(column.name!));
    setContainerColumns(containerColumns || []);
  };

  const onAddColumnClick = async () => {
    setIsAdding(true);

    const newColumn: ColumnDefinition = {
      name: newColumnName.replace(' ', ''),
      displayName: newColumnName,
      enforceUniqueValues: false,
      hidden: false,
      indexed: false,
      text: {
        allowMultipleLines: false,
        appendChangesToExistingText: false,
        linesForEditing: 0,
        maxLength: 255
      }
    };
    const graphClient = Providers.globalProvider.graph.client;
    const graphResponse = await graphClient.api(`/storage/fileStorage/containers/${props.containerId}/columns`)
                                           .version('beta')
                                           .post(newColumn);

    resetForm();
    await loadColumns();

    setIsAdding(false);
  };

  const onDeleteColumnClick = async (column: ColumnDefinition) => {
    setIsDeleting(true);

    const graphClient = Providers.globalProvider.graph.client;
    const graphResponse = await graphClient.api(`/storage/fileStorage/containers/${props.containerId}/columns/${column.id as string}`)
                                           .version('beta')
                                           .delete();

    resetForm();
    await loadColumns();

    setIsDeleting(false);
  };

  const columns: TableColumnDefinition<ColumnDefinition>[] = [
    createTableColumn({
      columnId: 'name',
      renderHeaderCell: () => {
        return 'Name'
      },
      renderCell: (containerColumn) => {
        return (
          <TableCellLayout>
            {containerColumn.displayName || containerColumn.name}
          </TableCellLayout>
        )
      }
    }),
    createTableColumn({
      columnId: 'actions',
      renderHeaderCell: () => {
        return 'Actions'
      },
      renderCell: (column) => {
        return (
          <>
            <Button aria-label="Delete"
              disabled={isAdding || isDeleting || !column.isDeletable}
              icon={deleteButtonIcon}
              onClick={() => { onDeleteColumnClick(column); }}>Delete</Button>
          </>
        )
      }
    })
  ];

  const columnSizingOptions = {
    name: {
      minWidth: 150,
      defaultWidth: 250,
      idealWidth: 250
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
          <DialogTitle>Container Columns</DialogTitle>

          <DialogContent>
            <div className={styles.addFormContainer}>
              <Text size={400} weight='bold'>Add column:</Text>
              <div className={styles.addForm}>
                <Input
                  placeholder='Column display name'
                  disabled={isAdding}
                  className={styles.inputBox}
                  value={newColumnName}
                  onChange={(e, d) => { setNewColumnName(d.value); }} />
                <Button
                  appearance='primary'
                  disabled={isAdding || isDeleting || newColumnName === ''}
                  icon={addButtonIcon}
                  onClick={onAddColumnClick}>Add</Button>
              </div>
            </div>

            <DataGrid
              items={containerColumns}
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
