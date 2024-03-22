import {
  Button, Spinner,
  Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTitle, DialogTrigger
} from "@fluentui/react-components";
import { DeleteRegular } from '@fluentui/react-icons';

export interface IDialogDeleteConfirmationProps {
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm?: (confirmed: Boolean) => void;
}

export const DialogDeleteConfirmation = (props: IDialogDeleteConfirmationProps) => {

  const deleteButtonIcon = (props.isDeleting) ? <Spinner size='tiny' /> : <DeleteRegular />;

  return (
    <Dialog open={props.isOpen} modalType='modal'>
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
                disabled={props.isDeleting}
                onClick={() => { if (props.onConfirm) { props.onConfirm(false); } }}>Cancel</Button>
            </DialogTrigger>
            <Button
              appearance='primary'
              icon={deleteButtonIcon}
              disabled={props.isDeleting}
              onClick={() => { if (props.onConfirm) { props.onConfirm(true); } }}>Delete</Button>
          </DialogActions>

        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
