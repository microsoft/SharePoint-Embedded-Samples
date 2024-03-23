import { useState, useEffect } from "react";
import {
  SaveFilled
} from "@fluentui/react-icons";
import {
  Button, Input, Spinner,
  Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTitle,
  Dropdown, Option, SelectionEvents, OptionOnSelectData,
  makeStyles, shorthands
} from "@fluentui/react-components";
import { Providers } from "@microsoft/mgt-element";
import { ColumnDefinition } from "@microsoft/microsoft-graph-types-beta";

const useStyles = makeStyles({
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

export interface IFileColumnsProps {
  isOpen: boolean;
  containerId: string;
  fileId: string;
  onClose?: () => void;
}

export const DialogFileColumns = (props: IFileColumnsProps) => {

  const [containerUserColumns, setContainerUserColumns] = useState<ColumnDefinition[]>([]);
  const [fileFieldData, setFileFieldData] = useState<any>();

  const [selectedColumn, setSelectedColumn] = useState<ColumnDefinition>();
  const [columnValue, setColumnValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    resetForm();
  }, [props.isOpen]);

  useEffect(() => {
    (async () => {
      if (props.containerId && props.fileId && props.isOpen) {
        await loadColumns();
        await loadFileFields();
      }
    })();
  }, [props.containerId, props.fileId, props.isOpen]);

  useEffect(() => {
    if (selectedColumn) {
      (Object.keys(fileFieldData).includes(selectedColumn.name!))
        ? setColumnValue(fileFieldData[selectedColumn.name!])
        : setColumnValue('');
    }
  }, [selectedColumn]);

  const resetForm = () => {
    setSelectedColumn(undefined);
    setColumnValue('');
  };

  const loadColumns = async () => {
    const graphClient = Providers.globalProvider.graph.client;
    const graphResponse = await graphClient.api(`/storage/fileStorage/containers/${props.containerId}/columns`)
                                           .version('beta')
                                           .filter('isSealed eq false AND readOnly eq false')
                                           .get();

    const containerColumns: ColumnDefinition[] = graphResponse.value;
    setContainerUserColumns(containerColumns || []);
  };

  const loadFileFields = async () => {
    const graphClient = Providers.globalProvider.graph.client;
    const graphResponse = await graphClient.api(`/drives/${props.containerId}/items/${props.fileId}/listItem/fields`)
                                           .get();

    setFileFieldData(graphResponse);
  };

  const onSelectedDropdownChange = (event: SelectionEvents, data: OptionOnSelectData) => {
    const selected = containerUserColumns.find((column) => column.id === data.optionValue);
    setSelectedColumn(selected);
  };

  const onSaveClick = async () => {
    setIsSaving(true);

    const graphClient = Providers.globalProvider.graph.client;

    console.log('selectedColumn', selectedColumn);
    const requestBody = {
      [selectedColumn?.name!]: columnValue
    };

    await graphClient.api(`/drives/${props.containerId}/items/${props.fileId}/listItem/fields`)
      .patch(requestBody);
    await loadFileFields();

    setIsSaving(false);
  };

  const saveButtonIcon = (isSaving) ? <Spinner size='tiny' /> : <SaveFilled />;

  const styles = useStyles();

  return (
    <Dialog open={props.isOpen} modalType='modal'>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Set File Column Value</DialogTitle>

          <DialogContent>
            <div className={styles.addForm}>
              <Dropdown
                disabled={isSaving}
                onOptionSelect={onSelectedDropdownChange}>
                {containerUserColumns.map((column) => (
                  <Option key={column.id!} value={column.id!}>{column.displayName!}</Option>
                ))}
              </Dropdown>
              <Input
                disabled={isSaving}
                className={styles.inputBox}
                value={columnValue}
                onChange={(e, d) => { setColumnValue(d.value); }} />
              <Button
                appearance='primary'
                disabled={isSaving || !selectedColumn}
                icon={saveButtonIcon}
                onClick={onSaveClick}>Save</Button>
            </div>
          </DialogContent>

          <DialogActions>
            <Button
              appearance='secondary'
              disabled={isSaving}
              onClick={() => { if (props.onClose) { props.onClose(); } }}>Close</Button>
          </DialogActions>

        </DialogBody>
      </DialogSurface>
    </Dialog>
  );

}
