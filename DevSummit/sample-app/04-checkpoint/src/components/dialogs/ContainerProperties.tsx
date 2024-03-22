import { useState, useEffect } from "react";
import {
  NewFilled,
  SearchRegular
} from "@fluentui/react-icons";
import {
  Button, Input, Text, Checkbox, Spinner,
  Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTitle,
  DataGrid, DataGridHeader, DataGridHeaderCell, DataGridBody, DataGridRow, DataGridCell,
  TableColumnDefinition, TableCellLayout, createTableColumn,
  makeStyles, shorthands
} from "@fluentui/react-components";
import type { CheckboxProps } from "@fluentui/react-components";
import { IContainerProperty } from "../../common";
import * as MOCKS from "../../mock-data";

import SpEmbedded from '../../services/spembedded';
const spe = new SpEmbedded();

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
    width: '150px'
  }
});

export interface IDialogContainerPropertiesProps {
  isOpen: boolean;
  containerId: string;
  onClose?: () => void;
}

export const DialogContainerProperties = (props: IDialogContainerPropertiesProps) => {

  const [containerProperties, setContainerProperties] = useState<IContainerProperty[]>([]);

  const [newPropertyName, setNewPropertyName] = useState<string>('');
  const [newPropertyValue, setNewPropertyValue] = useState<string>('');
  const [newPropertySearchable, setNewPropertySearchable] = useState<CheckboxProps['checked']>(false);

  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    (async () => {
      if (props.containerId && props.isOpen) {
        await loadItems();
      }
    })()
  }, [props.containerId, props.isOpen]);

  const loadItems = async () => {
    const containerProperties = await spe.listContainerProperties(props.containerId);
    setContainerProperties(containerProperties || []);
  };

  const onAddProperty = async () => {
    setIsAdding(true);

    const isChecked = (typeof newPropertySearchable !== 'boolean')
      ? false
      : newPropertySearchable as boolean;

    await spe.createContainerProperty(props.containerId, newPropertyName, newPropertyValue, isChecked);
    await loadItems();

    // reset form
    setNewPropertyName('');
    setNewPropertyValue('');
    setNewPropertySearchable(false);

    setIsAdding(false);
  };

  const columns: TableColumnDefinition<IContainerProperty>[] = [
    createTableColumn({
      columnId: 'propertyName',
      renderHeaderCell: () => {
        return 'Property'
      },
      renderCell: (containerProperty) => {
        return (
          <TableCellLayout>
            {containerProperty.propertyName}
            &nbsp;&nbsp;{containerProperty.isSearchable && <SearchRegular />}
          </TableCellLayout>
        )
      }
    }),
    createTableColumn({
      columnId: 'propertyValue',
      renderHeaderCell: () => {
        return 'Value'
      },
      renderCell: (containerProperty) => {
        return (
          <TableCellLayout>
            {containerProperty.propertyValue}
          </TableCellLayout>
        )
      }
    })
  ];

  const columnSizingOptions = {
    propertyName: {
      minWidth: 150,
      defaultWidth: 250,
      idealWidth: 200
    },
    propertyValue: {
      minWidth: 150,
      defaultWidth: 250
    }
  };

  const addButtonIcon = (isAdding) ? <Spinner size='tiny' /> : <NewFilled />;

  const styles = useStyles();

  return (
    <Dialog open={props.isOpen} modalType='modal'>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Container Properties</DialogTitle>

          <DialogContent>
            <div className={styles.addFormContainer}>
              <Text size={400} weight='bold'>Add property:</Text>
              <div className={styles.addForm}>
                <Input
                  placeholder='Property name'
                  disabled={isAdding}
                  className={styles.inputBox}
                  value={newPropertyName}
                  onChange={(e, d) => { setNewPropertyName(d.value); }} />
                <Input
                  placeholder='Property value'
                  disabled={isAdding}
                  className={styles.inputBox}
                  value={newPropertyValue}
                  onChange={(e, d) => { setNewPropertyValue(d.value); }} />
                <Checkbox
                  label='Searchable'
                  disabled={isAdding}
                  onChange={(e, d) => { setNewPropertySearchable(d.checked); }}
                  checked={newPropertySearchable} />
                <Button
                  appearance='primary'
                  disabled={isAdding || (newPropertyName === '') || (newPropertyValue === '')}
                  icon={addButtonIcon}
                  onClick={onAddProperty}>Add</Button>
              </div>
            </div>

            <DataGrid
              items={containerProperties}
              columns={columns}
              columnSizingOptions={columnSizingOptions}
              getRowId={(item) => item.propertyName}>
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
              disabled={isAdding}
              onClick={() => { if (props.onClose) { props.onClose(); } }}>Close</Button>
          </DialogActions>

        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
