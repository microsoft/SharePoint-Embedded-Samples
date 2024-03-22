import { useState, useEffect } from "react";
import {
  Button, Input, Spinner,
  Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTitle, DialogTrigger,
  makeStyles
} from "@fluentui/react-components";

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

export interface IDialogNewFolderProps {
  isOpen: boolean;
  isCreatingFolder: boolean;
  onCreateFolder?: (folderName: string) => void;
  onClose?: () => void;
}

export const DialogNewFolder = (props: IDialogNewFolderProps) => {
  const [folderName, setFolderName] = useState<string>('');

  const onFolderCreateClick = async () => {
    if (props.onCreateFolder) {
      props.onCreateFolder(folderName);
    }
  };

  useEffect(() => {
    // reset form
    setFolderName('');
  }, [props.isOpen]);

  const submitButtonIcon = (props.isCreatingFolder) ? <Spinner size='tiny' /> : null;

  const styles = useStyles();

  return (
    <Dialog open={props.isOpen} modalType='modal'>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Create New Folder</DialogTitle>

          <DialogContent className={styles.dialogContent}>
            <Input
              autoFocus required
              placeholder='Enter a name for the new folder'
              className={styles.dialogInputControl}
              value={folderName}
              onChange={(e, d) => { setFolderName(d.value); }}></Input>
          </DialogContent>

          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button
                appearance="secondary"
                disabled={props.isCreatingFolder}
                onClick={() => { if (props.onClose) { props.onClose(); } }}>Cancel</Button>
            </DialogTrigger>
            <Button
              appearance="primary"
              icon={submitButtonIcon}
              disabled={props.isCreatingFolder || (folderName === '')}
              onClick={onFolderCreateClick}>Create Folder</Button>
          </DialogActions>

        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
